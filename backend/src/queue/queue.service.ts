import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private mediaQueue: Queue;
  private redisClient: Redis;

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);

    this.redisClient = new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
    });

    this.mediaQueue = new Queue('media-processing', {
      connection: this.redisClient,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    this.logger.log('BullMQ QueueService initialized');
  }

  onModuleDestroy() {
    this.mediaQueue?.close();
    this.redisClient?.disconnect();
  }

  async addMediaProcessingJob(mediaId: string, action: 'NEW_UPLOAD' | 'RESCAN') {
    this.logger.log(`Enqueueing job for media: ${mediaId} (${action})`);
    return this.mediaQueue.add('process-media', { mediaId, action });
  }
}
