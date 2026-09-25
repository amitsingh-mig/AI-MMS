import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { ImageProcessorService } from '../media/image-processor.service';
import { RedisService } from '../redis/redis.service';
import { ProcessingStatus, MediaType } from '@prisma/client';

@Injectable()
export class MediaProcessorWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaProcessorWorker.name);
  private worker: Worker | null = null;
  private redisClient: Redis;

  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private imageProcessor: ImageProcessorService,
    private redisService: RedisService,
  ) {}

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);

    this.redisClient = new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
    });

    try {
      this.worker = new Worker(
        'media-processing',
        async (job: Job) => {
          this.logger.log(`Processing BullMQ media job: ${job.id}, data: ${JSON.stringify(job.data)}`);
          await this.processJob(job.data);
        },
        {
          connection: this.redisClient,
          concurrency: 4,
        },
      );

      this.worker.on('completed', (job) => {
        this.logger.log(`BullMQ Job ${job.id} completed successfully`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`BullMQ Job ${job?.id} failed: ${err.message}`);
      });

      this.logger.log('BullMQ MediaProcessorWorker initialized successfully');
    } catch (err: any) {
      this.logger.warn(`Could not initialize BullMQ Worker connection: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    this.redisClient?.disconnect();
  }

  async processJob(data: { mediaId: string; action: string }) {
    const { mediaId } = data;
    if (!mediaId || !this.prisma.isConnected) return;

    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaId } }).catch(() => null);
    if (!asset) {
      this.logger.warn(`Media asset ${mediaId} not found in database for job processing.`);
      return;
    }

    try {
      await this.prisma.mediaAsset.update({
        where: { id: mediaId },
        data: { processingStatus: ProcessingStatus.PROCESSING },
      });

      let thumbnailS3Key = asset.thumbnailS3Key;
      let previewS3Key = asset.previewS3Key;
      let width = asset.width;
      let height = asset.height;
      let exifData: Record<string, any> = {};

      // 1. Process image compression with Sharp + extract EXIF if it's an image
      if (asset.fileType === MediaType.IMAGE) {
        const processed = await this.imageProcessor.processAndStoreImage(asset.s3Key);
        if (processed) {
          thumbnailS3Key = processed.thumbnailS3Key;
          previewS3Key = processed.previewS3Key;
          if (processed.width) width = processed.width;
          if (processed.height) height = processed.height;
          if (processed.exif) exifData = processed.exif;
        }
      }

      // 2. Perform AI Scanning (Rekognition / Bedrock / Mock analysis)
      const aiResult = await this.aiService.analyzeMedia(
        asset.s3Bucket,
        asset.s3Key,
        asset.originalFileName,
        {
          country: asset.country,
          city: asset.city,
          event: asset.event,
          festival: asset.festival,
          year: asset.year,
        },
      );

      // 3. Update PostgreSQL record with WebP keys, EXIF, and AI metadata
      await this.prisma.mediaAsset.update({
        where: { id: mediaId },
        data: {
          thumbnailS3Key,
          previewS3Key,
          width,
          height,
          // EXIF / Camera fields
          captureDate: exifData.captureDate || null,
          cameraMake: exifData.cameraMake || null,
          cameraModel: exifData.cameraModel || null,
          lensModel: exifData.lensModel || null,
          focalLength: exifData.focalLength || null,
          aperture: exifData.aperture || null,
          shutterSpeed: exifData.shutterSpeed || null,
          iso: exifData.iso || null,
          gpsLatitude: exifData.gpsLatitude || null,
          gpsLongitude: exifData.gpsLongitude || null,
          gpsAltitude: exifData.gpsAltitude || null,
          // AI results
          aiDescription: aiResult.aiDescription,
          aiKeywords: aiResult.aiKeywords,
          ocrText: aiResult.ocrText,
          detectedObjects: aiResult.detectedObjects,
          detectedLandmarks: aiResult.detectedLandmarks,
          processingStatus: ProcessingStatus.COMPLETED,
        },
      });


      // Update vector embedding if pgvector extension is active
      if (aiResult.embedding && aiResult.embedding.length === 384) {
        const vectorStr = `[${aiResult.embedding.join(',')}]`;
        await this.prisma.$executeRawUnsafe(
          `UPDATE media_assets SET embedding = '${vectorStr}'::vector WHERE id = $1`,
          mediaId,
        ).catch((err: any) => {
          this.logger.warn(`pgvector embedding update warning for ${mediaId}: ${err.message}`);
        });
      }

      // Invalidate Redis caches
      await this.redisService.del('gallery:*');
      await this.redisService.del('search:*');

      this.logger.log(`Media processing completed for asset: ${mediaId}`);
    } catch (err: any) {
      this.logger.error(`Error processing media asset ${mediaId}: ${err.message}`);
      await this.prisma.mediaAsset.update({
        where: { id: mediaId },
        data: {
          processingStatus: ProcessingStatus.FAILED,
          processingError: err.message,
        },
      }).catch(() => null);
    }
  }
}
