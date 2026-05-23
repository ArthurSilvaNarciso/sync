import { Controller, Get, Post, Body, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Segment } from './segment.entity';
import { sanitizeText } from '../common/security/sanitize.util';

@ApiTags('Segments')
@Controller('api/segments')
export class SegmentsController {
  constructor(
    @InjectRepository(Segment) private readonly repo: Repository<Segment>,
  ) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Segments próximos (raio em km)' })
  async nearby(@Query('lat') lat: string, @Query('lng') lng: string, @Query('radiusKm') radiusKm?: string) {
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    const r = parseFloat(radiusKm || '10');
    if (!isFinite(latN) || !isFinite(lngN)) return [];
    const dLat = r / 111;
    const dLng = r / (111 * Math.cos((latN * Math.PI) / 180));
    return this.repo
      .createQueryBuilder('s')
      .where('s.startLat BETWEEN :latMin AND :latMax', { latMin: latN - dLat, latMax: latN + dLat })
      .andWhere('s.startLng BETWEEN :lngMin AND :lngMax', { lngMin: lngN - dLng, lngMax: lngN + dLng })
      .orderBy('s.attemptsCount', 'DESC')
      .limit(50)
      .getMany();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um segment' })
  async detail(@Param('id') id: string) {
    return this.repo.findOne({ where: { id }, relations: ['creator'] });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar segment' })
  async create(
    @CurrentUser() user: User,
    @Body() body: {
      name: string;
      description?: string;
      distanceMeters: number;
      startLat: number;
      startLng: number;
      endLat: number;
      endLng: number;
      city?: string;
      sport?: string;
    },
  ) {
    return this.repo.save(
      this.repo.create({
        name: sanitizeText(body.name, 100),
        description: sanitizeText(body.description, 500) || null,
        distanceMeters: body.distanceMeters,
        startLat: body.startLat,
        startLng: body.startLng,
        endLat: body.endLat,
        endLng: body.endLng,
        city: sanitizeText(body.city, 80) || null,
        sport: sanitizeText(body.sport, 40) || 'running',
        createdBy: user.id,
      }),
    );
  }
}
