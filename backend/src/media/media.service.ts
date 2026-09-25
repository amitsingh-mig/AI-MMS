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
    const uniqueId = randomUUID();
    const safeFileName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `uploads/${uniqueId}_${safeFileName}`;

    const presignedUrl = await this.s3Service.getPresignedUploadUrl(s3Key, dto.mimeType);

    return {
      presignedUrl,
      s3Key,
      s3Bucket: this.s3Service.getBucketName(),
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
        s3Bucket: this.s3Service.getBucketName(),
        albumId: dto.albumId || null,
        // Only set if explicitly provided — never invent default values
        country: dto.country || albumMetadata.country || null,
        year: dto.year ? Number(dto.year) : albumMetadata.year || null,
        city: dto.city || albumMetadata.city || null,
        event: dto.event || albumMetadata.event || null,
        festival: dto.festival || albumMetadata.festival || null,
        customKeywords: dto.customKeywords || [],
        processingStatus: ProcessingStatus.PENDING,
        uploadedById: userId,
      },
    });

    await this.redisService.del('gallery:*');
    await this.queueService.addMediaProcessingJob(mediaAsset.id, 'NEW_UPLOAD');

    return {
      id: mediaAsset.id,
      title: mediaAsset.title,
      s3Key: mediaAsset.s3Key,
      processingStatus: mediaAsset.processingStatus,
      message: 'Upload confirmed and queued for AI scanning & thumbnail generation.',
    };
  }

  /**
   * Returns the full media record with validated S3 signed URLs.
   * Falls back to direct S3 key lookup when DB is offline.
   */
  async findOne(id: string) {
    if (!this.prisma.isConnected) {
      // DB offline: treat id as S3 key and generate signed URL
      const decodedKey = decodeURIComponent(id);
      const downloadUrl = await this.s3Service.getPresignedDownloadUrl(decodedKey, 900);
      const fileName = decodedKey.split('/').pop() || decodedKey;
      return {
        id: decodedKey,
        title: fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        originalFileName: fileName,
        s3Key: decodedKey,
        s3Bucket: this.s3Service.getBucketName(),
        fileType: /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName) ? 'VIDEO' : 'IMAGE',
        fileSizeBytes: '0',
        mimeType: 'image/jpeg',
        processingStatus: 'COMPLETED',
        downloadUrl,
        thumbnailUrl: downloadUrl,
        previewUrl: downloadUrl,
        resolvedPreviewKey: decodedKey,
      };
    }

    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        album: { select: { id: true, name: true, country: true, year: true, city: true, event: true, festival: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!asset) throw new NotFoundException('Media asset not found');

    // Resolve best preview URL with real S3 validation
    const { previewUrl, thumbnailUrl, downloadUrl, resolvedPreviewKey } =
      await this.resolveSignedUrls(asset);

    return {
      ...asset,
      fileSizeBytes: asset.fileSizeBytes.toString(),
      downloadUrl,
      thumbnailUrl,
      previewUrl,
      resolvedPreviewKey,
      uploadedByName: asset.uploadedBy?.name || null,
      uploadedByEmail: asset.uploadedBy?.email || null,
      albumName: asset.album?.name || null,
    };
  }

  /**
   * GET /media/:id/preview
   * Validates S3 key chain and returns the best available signed preview URL.
   */
  async getMediaPreview(id: string) {
    // Support both DB UUID lookups and direct S3 key lookups
    let asset: any = null;

    if (this.prisma.isConnected) {
      asset = await this.prisma.mediaAsset.findUnique({
        where: { id },
        include: {
          album: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      }).catch(() => null);
    }

    if (!asset) {
      // Fallback: treat id as s3Key directly (for gallery items without DB records)
      const decodedKey = decodeURIComponent(id);
      const exists = await this.s3Service.objectExists(decodedKey);
      if (!exists) {
        throw new NotFoundException(`No S3 object found for key: ${decodedKey}`);
      }
      const url = await this.s3Service.getPresignedDownloadUrl(decodedKey, 900);
      return {
        url,
        resolvedKey: decodedKey,
        expiresIn: 900,
        source: 'direct-s3-key',
      };
    }

    const { previewUrl, resolvedPreviewKey } = await this.resolveSignedUrls(asset);

    if (!previewUrl) {
      throw new NotFoundException('No accessible S3 object found for this media asset.');
    }

    return {
      url: previewUrl,
      resolvedKey: resolvedPreviewKey,
      expiresIn: 900,
      source: 'database',
    };
  }

  /**
   * Resolves the best available signed URLs for an asset by checking S3 HeadObject.
   * Priority: previewS3Key → thumbnailS3Key → s3Key (original upload key)
   * For preview: previewS3Key → thumbnailS3Key → s3Key
   * For thumbnail: thumbnailS3Key → previewS3Key → s3Key
   * For download: always s3Key (original)
   */
  private async resolveSignedUrls(asset: any) {
    const isMock = this.s3Service.isMockMode();

    // Download always uses original s3Key
    const downloadUrl = asset.s3Key
      ? await this.s3Service.getPresignedDownloadUrl(asset.s3Key, 1800)
      : null;

    if (isMock) {
      // In mock mode, don't waste time on HeadObject checks
      const previewUrl = asset.previewS3Key
        ? await this.s3Service.getPresignedDownloadUrl(asset.previewS3Key, 900)
        : asset.thumbnailS3Key
          ? await this.s3Service.getPresignedDownloadUrl(asset.thumbnailS3Key, 900)
          : downloadUrl;

      const thumbnailUrl = asset.thumbnailS3Key
        ? await this.s3Service.getPresignedDownloadUrl(asset.thumbnailS3Key, 900)
        : previewUrl;

      return { previewUrl, thumbnailUrl, downloadUrl, resolvedPreviewKey: asset.previewS3Key || asset.thumbnailS3Key || asset.s3Key };
    }

    // Real S3: validate each key with HeadObject before generating URL
    const previewCandidates = [
      asset.previewS3Key,
      asset.thumbnailS3Key,
      asset.s3Key,
    ];

    const thumbnailCandidates = [
      asset.thumbnailS3Key,
      asset.previewS3Key,
      asset.s3Key,
    ];

    const resolvedPreviewKey = await this.s3Service.findFirstExistingKey(previewCandidates);
    const resolvedThumbKey = await this.s3Service.findFirstExistingKey(thumbnailCandidates);

    const previewUrl = resolvedPreviewKey
      ? await this.s3Service.getPresignedDownloadUrl(resolvedPreviewKey, 900)
      : null;

    const thumbnailUrl = resolvedThumbKey
      ? await this.s3Service.getPresignedDownloadUrl(resolvedThumbKey, 900)
      : null;

    return { previewUrl, thumbnailUrl, downloadUrl, resolvedPreviewKey };
  }

  async getSecureDownloadUrl(id: string, user: { id: string; role: Role }) {
    if (!this.prisma.isConnected) {
      // Direct S3 key mode
      const decodedKey = decodeURIComponent(id);
      const signedUrl = await this.s3Service.getPresignedDownloadUrl(decodedKey, 1800);
      return {
        id,
        title: decodedKey.split('/').pop() || decodedKey,
        fileName: decodedKey.split('/').pop() || decodedKey,
        downloadUrl: signedUrl,
        expiresInSeconds: 1800,
      };
    }

    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) {
      // Try treating id as s3Key
      const decodedKey = decodeURIComponent(id);
      const signedUrl = await this.s3Service.getPresignedDownloadUrl(decodedKey, 1800);
      return {
        id,
        title: decodedKey.split('/').pop() || decodedKey,
        fileName: decodedKey.split('/').pop() || decodedKey,
        downloadUrl: signedUrl,
        expiresInSeconds: 1800,
      };
    }

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
    if (!this.prisma.isConnected) {
      this.logger.log(`Direct S3 Deletion mode active for key: ${id}`);
      await this.s3Service.deleteObject(id);
      const fileName = id.split('/').pop() || id;
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      await this.s3Service.deleteObject(`low/${baseName}.webp`);
      await this.s3Service.deleteObject(`previews/${baseName}.webp`);
      return { message: 'Media asset deleted directly from AWS S3.' };
    }

    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } }).catch(() => null);
    if (asset) {
      if (user.role !== Role.ADMIN && asset.uploadedById !== user.id) {
        throw new ForbiddenException('Only Administrators or the owner can delete media assets');
      }

      await this.s3Service.deleteObject(asset.s3Key);
      if (asset.thumbnailS3Key) await this.s3Service.deleteObject(asset.thumbnailS3Key);
      if (asset.previewS3Key) await this.s3Service.deleteObject(asset.previewS3Key);

      await this.prisma.mediaAsset.delete({ where: { id } }).catch(() => null);
    } else {
      await this.s3Service.deleteObject(id);
      const fileName = id.split('/').pop() || id;
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      await this.s3Service.deleteObject(`low/${baseName}.webp`);
      await this.s3Service.deleteObject(`previews/${baseName}.webp`);
    }

    await this.redisService.del('gallery:*');
    await this.redisService.del('search:*');

    return { message: 'Media asset deleted successfully.' };
  }

  async syncS3BucketWithDatabase() {
    this.logger.log(`Starting S3 Bucket Auto-Discovery & Sync for bucket: ${this.s3Service.getBucketName()}`);

    if (!this.prisma.isConnected) {
      this.logger.warn('PostgreSQL DB disconnected: skipping S3 database indexing. Direct S3 listing mode active.');
      return { syncedCount: 0, totalObjectsFound: 0, message: 'Direct S3 mode active (DB offline)' };
    }

    let adminUser = await this.prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (!adminUser) adminUser = await this.prisma.user.findFirst();
    if (!adminUser) {
      this.logger.warn('No user found in database for S3 sync attribution.');
      return { syncedCount: 0, totalObjectsFound: 0 };
    }

    const prefixes = ['original/', 'uploads/', 'media/', 'previews/', 'low/'];
    const allObjects: { key: string; size: number; lastModified: Date }[] = [];

    for (const prefix of prefixes) {
      let continuationToken: string | undefined = undefined;
      do {
        const res = await this.s3Service.listObjects(prefix, continuationToken, 1000);
        allObjects.push(...res.contents);
        continuationToken = res.nextContinuationToken;
      } while (continuationToken);
    }

    const rootRes = await this.s3Service.listObjects('', undefined, 1000);
    for (const item of rootRes.contents) {
      if (!allObjects.some((o) => o.key === item.key)) {
        allObjects.push(item);
      }
    }

    const mediaObjects = allObjects.filter((obj) => {
      if (!obj.key || obj.key.endsWith('/')) return false;
      const keyLower = obj.key.toLowerCase();
      const isImage = /\.(jpg|jpeg|png|webp|gif|bmp|tiff|heic)$/i.test(keyLower);
      const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(keyLower);
      return isImage || isVideo;
    });

    const mainKeys = mediaObjects.filter(
      (obj) => !obj.key.startsWith('low/') && !obj.key.startsWith('previews/'),
    );
    const keysToProcess = mainKeys.length > 0 ? mainKeys : mediaObjects;

    let syncedCount = 0;

    for (const obj of keysToProcess) {
      const fileName = obj.key.split('/').pop() || obj.key;
      const baseName = fileName.replace(/\.[^/.]+$/, '');

      const existing = await this.prisma.mediaAsset.findFirst({
        where: { OR: [{ s3Key: obj.key }, { originalFileName: fileName }] },
      });
      if (existing) continue;

      const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
      const fileType = isVideo ? MediaType.VIDEO : MediaType.IMAGE;
      const mimeType = isVideo ? 'video/mp4' : fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

      // Only store thumbnail/preview keys that actually exist in the S3 listing
      const lowMatch = allObjects.find(
        (o) => o.key.startsWith('low/') && (o.key.endsWith(fileName) || o.key.endsWith(baseName + '.webp')),
      );
      const previewMatch = allObjects.find(
        (o) => o.key.startsWith('previews/') && (o.key.endsWith(fileName) || o.key.endsWith(baseName + '.webp')),
      );

      await this.prisma.mediaAsset.create({
        data: {
          title: cleanTitle,
          originalFileName: fileName,
          fileType,
          mimeType,
          fileSizeBytes: BigInt(obj.size || 1024),
          s3Key: obj.key,
          s3Bucket: this.s3Service.getBucketName(),
          thumbnailS3Key: lowMatch ? lowMatch.key : null,
          previewS3Key: previewMatch ? previewMatch.key : null,
          processingStatus: ProcessingStatus.PENDING,
          uploadedById: adminUser.id,
          // Do NOT invent taxonomy — leave null for synced items
          country: null,
          year: null,
          city: null,
          event: null,
          festival: null,
        },
      });
      syncedCount++;
    }

    if (syncedCount > 0) {
      await this.redisService.del('gallery:*');
      await this.redisService.del('search:*');
    }

    this.logger.log(`S3 Auto-Sync completed: ${syncedCount} new real S3 items indexed.`);
    return { syncedCount, totalObjectsFound: mediaObjects.length };
  }
}
