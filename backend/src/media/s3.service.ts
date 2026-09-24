import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private cloudFrontDomain: string;
  private isMock: boolean = false;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'ai-mms-media-storage';
    this.cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN || '';

    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && accessKeyId !== 'mock_key' && secretAccessKey && secretAccessKey !== 'mock_secret') {
      this.s3Client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
        endpoint: process.env.AWS_S3_ENDPOINT || undefined,
        forcePathStyle: !!process.env.AWS_S3_ENDPOINT,
      });
      this.logger.log(`AWS S3 Client initialized for bucket: ${this.bucketName}`);
    } else {
      this.isMock = true;
      this.logger.log(`AWS S3 credentials not provided. Operating in Mock S3 Storage Mode.`);
    }
  }

  async getPresignedUploadUrl(s3Key: string, contentType: string, expiresSeconds = 900): Promise<string> {
    if (this.isMock || !this.s3Client) {
      const apiHost = process.env.API_EXTERNAL_URL || 'http://localhost:4000';
      return `${apiHost}/api/media/mock-s3-upload?s3Key=${encodeURIComponent(s3Key)}`;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresSeconds });
  }

  async getPresignedDownloadUrl(s3Key: string, expiresSeconds = 3600): Promise<string> {
    if (this.cloudFrontDomain) {
      // CloudFront delivery URL
      return `https://${this.cloudFrontDomain}/${s3Key}`;
    }

    if (this.isMock || !this.s3Client) {
      const apiHost = process.env.API_EXTERNAL_URL || 'http://localhost:4000';
      return `${apiHost}/api/media/mock-s3-download?s3Key=${encodeURIComponent(s3Key)}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresSeconds });
  }

  async deleteObject(s3Key: string): Promise<void> {
    if (this.isMock || !this.s3Client) return;

    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      }));
    } catch (err: any) {
      this.logger.warn(`Failed to delete S3 object ${s3Key}: ${err.message}`);
    }
  }
}
