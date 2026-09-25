import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AIService } from '../ai/ai.service';
import { S3Service } from '../media/s3.service';
import { MediaService } from '../media/media.service';
import { MediaType } from '@prisma/client';

export interface SearchQueryDto {
  query?: string;
  country?: string;
  year?: number;
  city?: string;
  event?: string;
  festival?: string;
  mediaType?: MediaType;
  albumId?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private aiService: AIService,
    private s3Service: S3Service,
    private mediaService: MediaService,
  ) {}

  private async generatePresignedUrlsForItems(items: any[]) {
    return Promise.all(
      items.map(async (item) => {
        const origKey = item.s3Key;

        // Download always uses the actual original s3Key
        const downloadUrl = origKey
          ? await this.s3Service.getPresignedDownloadUrl(origKey, 3600)
          : undefined;

        // Thumbnail: only use thumbnailS3Key if it's actually stored in DB — never invent paths
        const thumbnailUrl = item.thumbnailS3Key
          ? await this.s3Service.getPresignedDownloadUrl(item.thumbnailS3Key, 3600)
          : downloadUrl;

        // Preview: only use previewS3Key if actually stored in DB
        const previewUrl = item.previewS3Key
          ? await this.s3Service.getPresignedDownloadUrl(item.previewS3Key, 3600)
          : thumbnailUrl || downloadUrl;

        return {
          ...item,
          fileSizeBytes: item.fileSizeBytes ? item.fileSizeBytes.toString() : '0',
          downloadUrl,
          thumbnailUrl,
          previewUrl,
        };
      })
    );
  }


  async searchMedia(dto: SearchQueryDto) {
    const page = dto.page ? Number(dto.page) : 1;
    const limit = dto.limit ? Number(dto.limit) : 24;
    const offset = (page - 1) * limit;

    const cacheKey = `search:${JSON.stringify(dto)}:p${page}:l${limit}`;
    const cached = await this.redisService.get<any>(cacheKey);
    if (cached) {
      this.logger.log(`Serving search query from Redis cache: ${cacheKey}`);
      return cached;
    }

    if (!this.prisma.isConnected) {
      this.logger.warn('PostgreSQL DB disconnected: serving search query via Direct AWS S3 Bucket mode.');
      return this.fallbackDirectS3Search(dto, offset, limit, page);
    }

    try {
      const dbAssetCount = await this.prisma.mediaAsset.count().catch(() => 0);
      if (dbAssetCount === 0) {
        try {
          await this.mediaService.syncS3BucketWithDatabase();
        } catch (err: any) {
          this.logger.warn(`Initial S3 sync error: ${err.message}`);
        }
      }

      const whereConditions: string[] = ['1=1'];
      const params: any[] = [];
      let paramIndex = 1;

      if (dto.country) {
        whereConditions.push(`(m.country ILIKE $${paramIndex} OR a.country ILIKE $${paramIndex})`);
        params.push(`%${dto.country}%`);
        paramIndex++;
      }

      if (dto.year) {
        whereConditions.push(`(m.year = $${paramIndex} OR a.year = $${paramIndex})`);
        params.push(Number(dto.year));
        paramIndex++;
      }

      if (dto.city) {
        whereConditions.push(`(m.city ILIKE $${paramIndex} OR a.city ILIKE $${paramIndex})`);
        params.push(`%${dto.city}%`);
        paramIndex++;
      }

      if (dto.event) {
        whereConditions.push(`(m.event ILIKE $${paramIndex} OR a.event ILIKE $${paramIndex})`);
        params.push(`%${dto.event}%`);
        paramIndex++;
      }

      if (dto.festival) {
        whereConditions.push(`(m.festival ILIKE $${paramIndex} OR a.festival ILIKE $${paramIndex})`);
        params.push(`%${dto.festival}%`);
        paramIndex++;
      }

      if (dto.mediaType) {
        whereConditions.push(`m."fileType" = $${paramIndex}::"MediaType"`);
        params.push(dto.mediaType);
        paramIndex++;
      }

      if (dto.albumId) {
        whereConditions.push(`m."albumId" = $${paramIndex}`);
        params.push(dto.albumId);
        paramIndex++;
      }

      if (dto.keyword) {
        whereConditions.push(`($${paramIndex} = ANY(m."customKeywords") OR $${paramIndex} = ANY(m."aiKeywords"))`);
        params.push(dto.keyword.toLowerCase());
        paramIndex++;
      }

      let orderByClause = 'ORDER BY m."createdAt" DESC';
      let selectVectorDist = '';

      if (dto.query && dto.query.trim()) {
        const q = dto.query.trim();
        const textQueryParam = `%${q}%`;
        const queryVector = this.aiService.generateDeterministicEmbedding(q);
        const vectorStr = `[${queryVector.join(',')}]`;

        whereConditions.push(`(
          m.title ILIKE $${paramIndex} OR
          m."aiDescription" ILIKE $${paramIndex} OR
          m."ocrText" ILIKE $${paramIndex} OR
          $${paramIndex + 1} = ANY(m."aiKeywords") OR
          m.city ILIKE $${paramIndex} OR
          m.event ILIKE $${paramIndex} OR
          m.festival ILIKE $${paramIndex} OR
          (m.embedding IS NOT NULL AND m.embedding <=> '${vectorStr}'::vector < 0.85)
        )`);

        selectVectorDist = `, CASE WHEN m.embedding IS NOT NULL THEN (m.embedding <=> '${vectorStr}'::vector) ELSE 1.0 END as distance`;
        orderByClause = 'ORDER BY distance ASC, m."createdAt" DESC';

        params.push(textQueryParam, q.toLowerCase());
        paramIndex += 2;
      }

      const whereClause = whereConditions.join(' AND ');

      const rawQuery = `
        SELECT 
          m.id, m.title, m."originalFileName", m."fileType", m."mimeType", m."fileSizeBytes",
          m."s3Key", m."s3Bucket", m.width, m.height, m."durationSeconds", m."albumId",
          m.country, m.year, m.city, m.event, m.festival, m."customKeywords",
          m."aiDescription", m."aiKeywords", m."ocrText", m."detectedObjects", m."detectedLandmarks",
          m."thumbnailS3Key", m."previewS3Key", m."processingStatus", m."processingError",
          m."uploadedById", m."createdAt", m."updatedAt",
          a.name as "albumName"
          ${selectVectorDist}
        FROM media_assets m
        LEFT JOIN albums a ON m."albumId" = a.id
        WHERE ${whereClause}
        ${orderByClause}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countQuery = `
        SELECT COUNT(*)::int as total
        FROM media_assets m
        LEFT JOIN albums a ON m."albumId" = a.id
        WHERE ${whereClause}
      `;

      const items: any[] = await this.prisma.$queryRawUnsafe(rawQuery, ...params);
      const countRes: any[] = await this.prisma.$queryRawUnsafe(countQuery, ...params);
      const total = countRes[0]?.total || 0;

      const formattedItems = await this.generatePresignedUrlsForItems(items);

      const result = {
        items: formattedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      await this.redisService.set(cacheKey, result, 300);
      return result;
    } catch (err: any) {
      this.logger.warn(`Search DB query unavailable (${err.message}). Falling back to Direct AWS S3 Bucket Listing for bucket ${this.s3Service.getBucketName()}`);
      return this.fallbackDirectS3Search(dto, offset, limit, page);
    }
  }

  private async fallbackDirectS3Search(dto: SearchQueryDto, offset: number, limit: number, page: number) {
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
      (obj) => !obj.key.startsWith('low/') && !obj.key.startsWith('previews/')
    );
    const keysToProcess = mainKeys.length > 0 ? mainKeys : mediaObjects;

    let filtered = keysToProcess;

    if (dto.mediaType) {
      filtered = filtered.filter((o) => {
        const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(o.key);
        return dto.mediaType === 'VIDEO' ? isVideo : !isVideo;
      });
    }

    if (dto.query && dto.query.trim()) {
      const q = dto.query.toLowerCase().trim();
      filtered = filtered.filter((o) => o.key.toLowerCase().includes(q));
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    const items = await Promise.all(
      paginated.map(async (obj) => {
        const fileName = obj.key.split('/').pop() || obj.key;
        const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
        
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        const lowMatch = allObjects.find(
          (o) => o.key.startsWith('low/') && (o.key.endsWith(fileName) || o.key.endsWith(baseName + '.webp'))
        );
        const previewMatch = allObjects.find(
          (o) => o.key.startsWith('previews/') && (o.key.endsWith(fileName) || o.key.endsWith(baseName + '.webp'))
        );

        const lowKey = lowMatch ? lowMatch.key : `low/${baseName}.webp`;
        const previewKey = previewMatch ? previewMatch.key : `previews/${baseName}.webp`;

        const downloadUrl = await this.s3Service.getPresignedDownloadUrl(obj.key, 3600);
        const thumbnailUrl = await this.s3Service.getPresignedDownloadUrl(lowKey, 3600);
        const previewUrl = await this.s3Service.getPresignedDownloadUrl(previewKey, 3600);


        return {
          id: obj.key,
          title: cleanTitle,
          originalFileName: fileName,
          fileType: isVideo ? 'VIDEO' : 'IMAGE',
          mimeType: isVideo ? 'video/mp4' : fileName.endsWith('.png') ? 'image/png' : 'image/jpeg',
          fileSizeBytes: (obj.size || 0).toString(),
          s3Key: obj.key,
          s3Bucket: this.s3Service.getBucketName(),
          processingStatus: 'COMPLETED',
          downloadUrl,
          thumbnailUrl,
          previewUrl,
          createdAt: obj.lastModified ? obj.lastModified.toISOString() : new Date().toISOString(),
        };
      })
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

