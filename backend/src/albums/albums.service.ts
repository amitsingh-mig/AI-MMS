import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAlbumDto {
  name: string;
  description?: string;
  country?: string;
  year?: number;
  city?: string;
  event?: string;
  festival?: string;
  keywords?: string[];
}

@Injectable()
export class AlbumsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    if (!this.prisma.isConnected) return [];
    try {
      return await this.prisma.album.findMany({
        include: {
          _count: { select: { mediaAssets: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err: any) {
      return [];
    }
  }

  async findOne(id: string) {
    if (!this.prisma.isConnected) throw new NotFoundException('Album not found (DB offline)');
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        mediaAssets: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { mediaAssets: true } },
      },
    }).catch(() => null);
    if (!album) throw new NotFoundException('Album not found');
    return album;
  }

  async create(dto: CreateAlbumDto) {
    if (!this.prisma.isConnected) {
      return { id: 'temp-id', ...dto, createdAt: new Date(), updatedAt: new Date() };
    }
    return this.prisma.album.create({
      data: {
        name: dto.name,
        description: dto.description,
        country: dto.country || 'India',
        year: dto.year ? Number(dto.year) : 2026,
        city: dto.city,
        event: dto.event,
        festival: dto.festival,
        keywords: dto.keywords || [],
      },
    });
  }

  async update(id: string, dto: Partial<CreateAlbumDto>) {
    await this.findOne(id);
    return this.prisma.album.update({
      where: { id },
      data: {
        ...dto,
        year: dto.year ? Number(dto.year) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.album.delete({ where: { id } });
  }

  async getFilterOptions() {
    if (!this.prisma.isConnected) {
      return {
        countries: ['India'],
        years: [2026, 2025],
        cities: ['Delhi', 'Agra', 'Mumbai'],
        events: ['Conference', 'Festival', 'Exhibition'],
        festivals: ['Diwali', 'Holi'],
      };
    }
    try {
      const countries = await this.prisma.album.findMany({
        select: { country: true },
        distinct: ['country'],
      });
      const years = await this.prisma.album.findMany({
        select: { year: true },
        distinct: ['year'],
      });
      const cities = await this.prisma.album.findMany({
        select: { city: true },
        distinct: ['city'],
      });
      const events = await this.prisma.album.findMany({
        select: { event: true },
        distinct: ['event'],
      });
      const festivals = await this.prisma.album.findMany({
        select: { festival: true },
        distinct: ['festival'],
      });

      return {
        countries: countries.map((c) => c.country).filter(Boolean),
        years: years.map((y) => y.year).filter(Boolean),
        cities: cities.map((c) => c.city).filter(Boolean),
        events: events.map((e) => e.event).filter(Boolean),
        festivals: festivals.map((f) => f.festival).filter(Boolean),
      };
    } catch (err: any) {
      return {
        countries: ['India'],
        years: [2026, 2025],
        cities: ['Delhi', 'Agra', 'Mumbai'],
        events: ['Conference', 'Festival'],
        festivals: ['Diwali', 'Holi'],
      };
    }
  }

}
