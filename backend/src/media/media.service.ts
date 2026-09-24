import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './s3.service';
import { QueueService } from '../queue/queue.service';
import { RedisService } from '../redis/redis.service';
import { MediaType, ProcessingStatus, Role } from '@prisma/client';
import { randomUUID } from 'crypto';

export interface PresignedUrlDto {
  fileName: string;
  fileType: MediaType;
  mimeType: string;
  fileSizeBytes: number;
}

export interface ConfirmUploadDto {
  s3Key: string;
  title: string;
  originalFileName: string;
  fileType: MediaType;
  mimeType: string;
  fileSizeBytes: number;
  albumId?: string;
  country?: string;
  year?: number;
  city?: string;
  event?: string;
  festival?: string;
  customKeywords?: string[];
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private queueService: QueueService,
    private redisService: RedisService,
  ) {}

  async generatePresignedUploadUrl(dto: PresignedUrlDto, userId: string) {
    const fileExtension = dto.fileName.split('.').pop() || 'bin';
    const uniqueId = randomUUID();
    const datePrefix = new Date().toISOString().slice(0, 10);
    const s3Key = `uploads/${datePrefix}/${uniqueId}_${dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const presignedUrl = await this.s3Service.getPresignedUploadUrl(s3Key, dto.mimeType);

    return {
      presignedUrl,
      s3Key,
      s3Bucket: process.env.AWS_S3_BUCKET || 'ai-mms-media-storage',
    };
  }

  async confirmUpload(dto: ConfirmUploadDto, userId: string) {
    let albumMetadata: any = {};
    if (dto.albumId) {
      const album = await this.prisma.album.findUnique({ where: { id: dto.albumId } });
      if (album) {
        albumMetadata = {
          country: album.country,
          year: album.year,
          city: album.city,
          event: album.event,
          festival: album.festival,
        };
      }
    }

    const mediaAsset = await this.prisma.mediaAsset.create({
      data: {
        title: dto.title || dto.originalFileName,
        originalFileName: dto.originalFileName,
        fileType: dto.fileType,
        mimeType: dto.mimeType,
        fileSizeBytes: BigInt(dto.fileSizeBytes),
        s3Key: dto.s3Key,
        s3Bucket: process.env.AWS_S3_BUCKET || 'ai-mms-media-storage',
        albumId: dto.albumId || null,
        country: dto.country || albumMetadata.country || 'India',
        year: dto.year ? Number(dto.year) : albumMetadata.year || 2026,
        city: dto.city || albumMetadata.city || 'Delhi',
        event: dto.event || albumMetadata.event || 'Festival',
        festival: dto.festival || albumMetadata.festival || 'Diwali',
        customKeywords: dto.customKeywords || [],
        processingStatus: ProcessingStatus.PENDING,
        uploadedById: userId,
      },
    });

    // Invalidate search cache
    await this.redisService.del('gallery:*');

    // Trigger BullMQ background job
    await this.queueService.addMediaProcessingJob(mediaAsset.id, 'NEW_UPLOAD');

    return {
      id: mediaAsset.id,
      title: mediaAsset.title,
      s3Key: mediaAsset.s3Key,
      processingStatus: mediaAsset.processingStatus,
      message: 'Upload confirmed and queued for AI scanning & thumbnail generation.',
    };
  }

  async findOne(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        album: true,
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!asset) throw new NotFoundException('Media asset not found');

    const downloadUrl = await this.s3Service.getPresignedDownloadUrl(asset.s3Key);
    const thumbnailUrl = asset.thumbnailS3Key ? await this.s3Service.getPresignedDownloadUrl(asset.thumbnailS3Key) : downloadUrl;
    const previewUrl = asset.previewS3Key ? await this.s3Service.getPresignedDownloadUrl(asset.previewS3Key) : downloadUrl;

    return {
      ...asset,
      fileSizeBytes: asset.fileSizeBytes.toString(),
      downloadUrl,
      thumbnailUrl,
      previewUrl,
    };
  }

  async getSecureDownloadUrl(id: string, user: { id: string; role: Role }) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Media asset not found');

    const signedUrl = await this.s3Service.getPresignedDownloadUrl(asset.s3Key, 1800);
    return {
      id: asset.id,
      title: asset.title,
      fileName: asset.originalFileName,
      downloadUrl: signedUrl,
      expiresInSeconds: 1800,
    };
  }

  async rescanAI(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Media asset not found');

    await this.prisma.mediaAsset.update({
      where: { id },
      data: { processingStatus: ProcessingStatus.PROCESSING },
    });

    await this.queueService.addMediaProcessingJob(id, 'RESCAN');

    return { message: 'AI Rescan job queued successfully.' };
  }

  async deleteMedia(id: string, user: { id: string; role: Role }) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Media asset not found');

    if (user.role !== Role.ADMIN && asset.uploadedById !== user.id) {
      throw new ForbiddenException('Only Administrators or the owner can delete media assets');
    }

    // Delete S3 files
    await this.s3Service.deleteObject(asset.s3Key);
    if (asset.thumbnailS3Key) await this.s3Service.deleteObject(asset.thumbnailS3Key);
    if (asset.previewS3Key) await this.s3Service.deleteObject(asset.previewS3Key);

    // Delete DB record
    await this.prisma.mediaAsset.delete({ where: { id } });

    return { message: 'Media asset deleted successfully.' };
  }
}
