import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { S3Service } from './s3.service';
import { ImageProcessorService } from './image-processor.service';

@Module({
  providers: [MediaService, S3Service, ImageProcessorService],
  controllers: [MediaController],
  exports: [MediaService, S3Service, ImageProcessorService],
})
export class MediaModule {}

