import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaType } from '@prisma/client';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') query?: string,
    @Query('country') country?: string,
    @Query('year') year?: string,
    @Query('city') city?: string,
    @Query('event') event?: string,
    @Query('festival') festival?: string,
    @Query('mediaType') mediaType?: MediaType,
    @Query('albumId') albumId?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.searchMedia({
      query,
      country,
      year: year ? parseInt(year, 10) : undefined,
      city,
      event,
      festival,
      mediaType,
      albumId,
      keyword,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 24,
    });
  }
}
