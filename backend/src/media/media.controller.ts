import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Put,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { MediaService, PresignedUrlDto, ConfirmUploadDto } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { Response } from 'express';

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Sync ──────────────────────────────────────────────────────────────────
  @Get('sync-s3')
  async syncS3() {
    return this.mediaService.syncS3BucketWithDatabase();
  }

  // ── Upload Flow ───────────────────────────────────────────────────────────
  @Post('presigned-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async getPresignedUploadUrl(@Body() dto: PresignedUrlDto, @Request() req: any) {
    return this.mediaService.generatePresignedUploadUrl(dto, req.user.id);
  }

  @Post('confirm-upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async confirmUpload(@Body() dto: ConfirmUploadDto, @Request() req: any) {
    const res = await this.mediaService.confirmUpload(dto, req.user.id);
    await this.auditService.logAction('UPLOAD', req.user.id, res.id, {
      title: dto.title,
      s3Key: dto.s3Key,
    });
    return res;
  }

  // ── Preview (with S3 validation) ──────────────────────────────────────────
  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  async getPreview(@Param('id') id: string, @Request() req: any) {
    const decodedId = decodeURIComponent(id);
    return this.mediaService.getMediaPreview(decodedId);
  }

  // ── Download (original S3 file) ───────────────────────────────────────────
  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  async getDownloadUrl(@Param('id') id: string, @Request() req: any) {
    const decodedId = decodeURIComponent(id);
    const res = await this.mediaService.getSecureDownloadUrl(decodedId, req.user);
    await this.auditService.logAction('DOWNLOAD', req.user.id, decodedId, { title: res.title });
    return res;
  }

  // ── Find One (full record with signed URLs) ────────────────────────────────
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const decodedId = decodeURIComponent(id);
    return this.mediaService.findOne(decodedId);
  }

  // ── AI Re-scan ────────────────────────────────────────────────────────────
  @Post(':id/rescan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async rescanAI(@Param('id') id: string, @Request() req: any) {
    const decodedId = decodeURIComponent(id);
    const res = await this.mediaService.rescanAI(decodedId);
    await this.auditService.logAction('AI_RESCAN', req.user.id, decodedId);
    return res;
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async deleteMedia(@Param('id') id: string, @Request() req: any) {
    const decodedId = decodeURIComponent(id);
    const res = await this.mediaService.deleteMedia(decodedId, req.user);
    await this.auditService.logAction('DELETE', req.user.id, decodedId);
    return res;
  }

  @Delete(':folder/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async deleteNestedMedia(
    @Param('folder') folder: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const fullKey = `${folder}/${id}`;
    const res = await this.mediaService.deleteMedia(fullKey, req.user);
    await this.auditService.logAction('DELETE', req.user.id, fullKey);
    return res;
  }

  // ── Mock S3 Endpoints (local dev) ─────────────────────────────────────────
  @Put('mock-s3-upload')
  async handleMockS3Upload(@Query('s3Key') s3Key: string, @Res() res: Response) {
    return res.status(HttpStatus.OK).json({ status: 'success', s3Key, message: 'Mock S3 upload complete.' });
  }

  @Get('mock-s3-download')
  async handleMockS3Download(@Query('s3Key') s3Key: string, @Res() res: Response) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="50%" stop-color="#1e1b4b" />
            <stop offset="100%" stop-color="#312e81" />
          </linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#g)" />
        <circle cx="400" cy="250" r="80" fill="#6366f1" opacity="0.4" />
        <path d="M 200 450 L 350 300 L 450 400 L 550 280 L 650 450 Z" fill="#818cf8" opacity="0.6" />
        <text x="400" y="520" font-family="sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">
          PIX AI MMS — Mock Preview
        </text>
        <text x="400" y="550" font-family="sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">
          ${s3Key}
        </text>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svg);
  }
}
