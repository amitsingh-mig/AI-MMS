import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { S3Service } from './s3.service';

@Module({
  providers: [MediaService, S3Service],
  controllers: [MediaController],
  exports: [MediaService, S3Service],
})
export class MediaModule {}
