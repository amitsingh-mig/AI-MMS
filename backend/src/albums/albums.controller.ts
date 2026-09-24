import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AlbumsService, CreateAlbumDto } from './albums.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Controller('albums')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlbumsController {
  constructor(
    private readonly albumsService: AlbumsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async findAll() {
    return this.albumsService.findAll();
  }

  @Get('filters')
  async getFilterOptions() {
    return this.albumsService.getFilterOptions();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.albumsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  async create(@Body() dto: CreateAlbumDto, @Request() req: any) {
    const album = await this.albumsService.create(dto);
    await this.auditService.logAction('ALBUM_CREATE', req.user.id, undefined, { albumId: album.id, name: album.name });
    return album;
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateAlbumDto>, @Request() req: any) {
    const album = await this.albumsService.update(id, dto);
    await this.auditService.logAction('ALBUM_UPDATE', req.user.id, undefined, { albumId: id });
    return album;
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string, @Request() req: any) {
    const res = await this.albumsService.remove(id);
    await this.auditService.logAction('ALBUM_DELETE', req.user.id, undefined, { albumId: id });
    return res;
  }
}
