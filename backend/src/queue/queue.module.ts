import { Global, Module, forwardRef } from '@nestjs/common';
import { QueueService } from './queue.service';
import { MediaProcessorWorker } from './media-processor.worker';
import { MediaModule } from '../media/media.module';
import { AIModule } from '../ai/ai.module';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [forwardRef(() => MediaModule), AIModule, RedisModule],
  providers: [QueueService, MediaProcessorWorker],
  exports: [QueueService, MediaProcessorWorker],
})
export class QueueModule {}

