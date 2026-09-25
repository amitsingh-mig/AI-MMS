import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private cloudFrontDomain: string;
  private isMock: boolean = false;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME || 'ai-pics-mig';
    this.cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN || '';

    const region = process.env.AWS_REGION || 'ap-south-1';
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

  getBucketName(): string {
    return this.bucketName;
  }

  isMockMode(): boolean {
    return this.isMock;
  }

  /**
   * Check if an S3 object exists using HeadObject.
   * Returns true if the object exists, false otherwise.
   */
  async objectExists(s3Key: string): Promise<boolean> {
    if (this.isMock || !this.s3Client) return false;
    try {
      await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: s3Key }),
      );
      return true;
    } catch (err: any) {
      // 404 / NoSuchKey means it does not exist
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404 || err.name === 'NoSuchKey') {
        return false;
      }
      this.logger.warn(`HeadObject error for key "${s3Key}": ${err.message}`);
      return false;
    }
  }

  /**
   * Find the first key in the list that actually exists in S3.
   * Returns null if none exists.
   */
  async findFirstExistingKey(keys: (string | null | undefined)[]): Promise<string | null> {
    for (const key of keys) {
      if (!key) continue;
      const exists = await this.objectExists(key);
      if (exists) return key;
    }
    return null;
  }

  async listObjects(prefix?: string, continuationToken?: string, maxKeys = 1000) {
    if (this.isMock || !this.s3Client) {
      return { contents: [], nextContinuationToken: undefined };
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: maxKeys,
      });

      const res = await this.s3Client.send(command);
      return {
        contents: (res.Contents || []).map((obj) => ({
          key: obj.Key || '',
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
          eTag: obj.ETag,
        })),
        nextContinuationToken: res.NextContinuationToken,
      };
    } catch (err: any) {
      this.logger.error(`Error listing S3 objects prefix="${prefix}": ${err.message}`);
      return { contents: [], nextContinuationToken: undefined };
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

  async getObjectBuffer(s3Key: string): Promise<Buffer | null> {
    if (this.isMock || !this.s3Client) return null;
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });
      const response = await this.s3Client.send(command);
      if (!response.Body) return null;
      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } catch (err: any) {
      this.logger.error(`Error fetching buffer for key ${s3Key}: ${err.message}`);
      return null;
    }
  }

  async putObjectBuffer(s3Key: string, buffer: Buffer, contentType = 'image/webp'): Promise<void> {
    if (this.isMock || !this.s3Client) return;
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      });
      await this.s3Client.send(command);
    } catch (err: any) {
      this.logger.error(`Error uploading buffer for key ${s3Key}: ${err.message}`);
    }
  }
}
