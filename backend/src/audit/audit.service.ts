import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async logAction(action: string, userId?: string, mediaId?: string, details?: any, ipAddress?: string) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          userId,
          mediaId,
          details: details ? details : undefined,
          ipAddress,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to create audit log: ${err.message}`);
    }
  }

  async getLogs(page = 1, limit = 50, action?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (action) where.action = action;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          media: { select: { id: true, title: true, s3Key: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }
}
