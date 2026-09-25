import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { S3Service } from './s3.service';

export interface ExifCameraData {
  captureDate?: Date | null;
  cameraMake?: string | null;
  cameraModel?: string | null;
  lensModel?: string | null;
  focalLength?: number | null;
  aperture?: number | null;
  shutterSpeed?: string | null;
  iso?: number | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  gpsAltitude?: number | null;
}

export interface ProcessedImages {
  thumbnailS3Key: string;
  previewS3Key: string;
  width?: number;
  height?: number;
  exif?: ExifCameraData;
}

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  constructor(private s3Service: S3Service) {}

  /**
   * Extracts EXIF / camera metadata from an image buffer using exifr.
   */
  async extractExif(buffer: Buffer): Promise<ExifCameraData> {
    try {
      // Dynamic import: exifr is ESM — require with interop
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const exifr = require('exifr');
      const parseExif = exifr.parse || exifr.default?.parse || exifr;

      const exif = await parseExif(buffer, {
        tiff: true,
        exif: true,
        gps: true,
        ifd0: true,
        translateValues: true,
        translateKeys: true,
        reviveValues: true,
        sanitize: true,
        mergeOutput: true,
      }).catch(() => null);

      if (!exif) return {};

      // Build shutter speed string from ExposureTime (e.g. 0.004 → "1/250")
      let shutterSpeed: string | null = null;
      if (exif.ExposureTime) {
        const et = Number(exif.ExposureTime);
        if (et < 1) {
          const denom = Math.round(1 / et);
          shutterSpeed = `1/${denom}`;
        } else {
          shutterSpeed = `${et}s`;
        }
      } else if (exif.ShutterSpeedValue) {
        shutterSpeed = `1/${Math.round(Math.pow(2, exif.ShutterSpeedValue))}`;
      }

      // GPS
      let gpsLatitude: number | null = null;
      let gpsLongitude: number | null = null;
      let gpsAltitude: number | null = null;

      if (exif.latitude != null) gpsLatitude = Number(exif.latitude);
      if (exif.longitude != null) gpsLongitude = Number(exif.longitude);
      if (exif.altitude != null) gpsAltitude = Number(exif.altitude);

      // Capture date: prefer DateTimeOriginal > DateTimeDigitized > DateTime
      let captureDate: Date | null = null;
      const rawDate = exif.DateTimeOriginal || exif.DateTimeDigitized || exif.DateTime;
      if (rawDate) {
        try {
          captureDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
          if (isNaN(captureDate.getTime())) captureDate = null;
        } catch {
          captureDate = null;
        }
      }

      return {
        captureDate,
        cameraMake: exif.Make?.trim() || null,
        cameraModel: exif.Model?.trim() || null,
        lensModel: exif.LensModel?.trim() || exif.Lens?.trim() || null,
        focalLength: exif.FocalLength != null ? Number(exif.FocalLength) : null,
        aperture: exif.FNumber != null ? Number(exif.FNumber) : exif.ApertureValue != null ? Number(exif.ApertureValue) : null,
        shutterSpeed,
        iso: exif.ISO != null ? Number(exif.ISO) : exif.ISOSpeedRatings != null ? Number(exif.ISOSpeedRatings) : null,
        gpsLatitude,
        gpsLongitude,
        gpsAltitude,
      };
    } catch (err: any) {
      this.logger.warn(`EXIF extraction failed: ${err.message}`);
      return {};
    }
  }

  /**
   * Generates WebP thumbnail (300px) and preview (1200px) images using Sharp,
   * uploads them to S3, and returns the S3 keys, dimensions, and EXIF data.
   */
  async processAndStoreImage(s3Key: string): Promise<ProcessedImages | null> {
    try {
      const fileName = s3Key.split('/').pop() || s3Key;
      const baseName = fileName.replace(/\.[^/.]+$/, '');

      const thumbnailS3Key = `low/${baseName}.webp`;
      const previewS3Key = `previews/${baseName}.webp`;

      const buffer = await this.s3Service.getObjectBuffer(s3Key);
      if (!buffer) {
        this.logger.warn(`No buffer retrieved from S3 for key: ${s3Key}. Image processing skipped.`);
        return { thumbnailS3Key, previewS3Key };
      }

      // Extract EXIF camera data BEFORE any Sharp processing (Sharp strips EXIF)
      const exif = await this.extractExif(buffer);

      // Read image dimensions from Sharp metadata
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width;
      const height = metadata.height;

      // 1. Generate 300px WebP Thumbnail
      const thumbnailBuffer = await sharp(buffer)
        .resize({ width: 300, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      await this.s3Service.putObjectBuffer(thumbnailS3Key, thumbnailBuffer, 'image/webp');

      // 2. Generate 1200px WebP Preview
      const previewBuffer = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      await this.s3Service.putObjectBuffer(previewS3Key, previewBuffer, 'image/webp');

      this.logger.log(
        `Sharp processing done: ${s3Key} → ${thumbnailS3Key} & ${previewS3Key}` +
          (exif.cameraMake ? ` | Camera: ${exif.cameraMake} ${exif.cameraModel}` : '') +
          (exif.captureDate ? ` | Captured: ${exif.captureDate.toISOString()}` : ''),
      );

      return { thumbnailS3Key, previewS3Key, width, height, exif };
    } catch (err: any) {
      this.logger.error(`Error processing image ${s3Key} with Sharp: ${err.message}`);
      const fileName = s3Key.split('/').pop() || s3Key;
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      return {
        thumbnailS3Key: `low/${baseName}.webp`,
        previewS3Key: `previews/${baseName}.webp`,
      };
    }
  }
}
