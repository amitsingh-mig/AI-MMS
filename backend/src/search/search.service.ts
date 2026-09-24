import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AIService } from '../ai/ai.service';
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
  ) {}

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

    try {
      const items: any[] = await this.prisma.$queryRawUnsafe(rawQuery, ...params);
      const countRes: any[] = await this.prisma.$queryRawUnsafe(countQuery, ...params);
      const total = countRes[0]?.total || 0;

      // Convert BigInt fileSizeBytes to string for JSON serialization
      const formattedItems = items.map((item) => ({
        ...item,
        fileSizeBytes: item.fileSizeBytes ? item.fileSizeBytes.toString() : '0',
      }));

      const result = {
        items: formattedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      await this.redisService.set(cacheKey, result, 120);
      return result;
    } catch (err: any) {
      this.logger.error(`Search query error: ${err.message}`);
      // Fallback standard Prisma query
      const [items, total] = await Promise.all([
        this.prisma.mediaAsset.findMany({
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { album: { select: { id: true, name: true } } },
        }),
        this.prisma.mediaAsset.count(),
      ]);

      return {
        items: items.map((i) => ({ ...i, fileSizeBytes: i.fileSizeBytes.toString() })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
  }
}
