import { Controller, Get, Post, Body, Query, UseGuards, Param, BadRequestException } from '@nestjs/common';
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
    // Cap radius: mínimo 0.5 km, máximo 50 km (evita bounding-box gigante)
    const r = Math.max(0.5, Math.min(50, parseFloat(radiusKm || '10')));
    if (!isFinite(latN) || !isFinite(lngN)) return [];
    // Validação de coordenadas GPS
    if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) return [];
    const dLat = r / 111;
    const dLng = r / (111 * Math.cos((latN * Math.PI) / 180));
    const segments = await this.repo
      .createQueryBuilder('s')
      .where('s.startLat BETWEEN :latMin AND :latMax', { latMin: latN - dLat, latMax: latN + dLat })
      .andWhere('s.startLng BETWEEN :lngMin AND :lngMax', { lngMin: lngN - dLng, lngMax: lngN + dLng })
      .orderBy('s.attemptsCount', 'DESC')
      .limit(50)
      .getMany();
    // Não expõe o criador neste endpoint (lista pública)
    return segments.map(({ creator: _creator, ...s }) => s);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um segment' })
  async detail(@Param('id') id: string) {
    const segment = await this.repo.findOne({ where: { id }, relations: ['creator'] });
    if (!segment) return null;
    // Projeta apenas campos públicos do criador (sem email, lat, long)
    const safeCreator = segment.creator
      ? {
          id: segment.creator.id,
          name: segment.creator.name,
          avatarUrl: (segment.creator as any).avatarUrl,
          city: (segment.creator as any).city,
          level: (segment.creator as any).level,
        }
      : null;
    return { ...segment, creator: safeCreator };
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
    // Valida coordenadas GPS
    const coords = [
      { v: body.startLat, min: -90, max: 90 },
      { v: body.endLat, min: -90, max: 90 },
      { v: body.startLng, min: -180, max: 180 },
      { v: body.endLng, min: -180, max: 180 },
    ];
    for (const c of coords) {
      if (!isFinite(Number(c.v)) || Number(c.v) < c.min || Number(c.v) > c.max) {
        throw new BadRequestException('Coordenadas GPS inválidas');
      }
    }
    // Clamp distância: 1 m a 500 km
    const dist = Math.max(1, Math.min(500_000, Number(body.distanceMeters) || 0));
    return this.repo.save(
      this.repo.create({
        name: sanitizeText(body.name, 100),
        description: sanitizeText(body.description, 500) || null,
        distanceMeters: dist,
        startLat: Number(body.startLat),
        startLng: Number(body.startLng),
        endLat: Number(body.endLat),
        endLng: Number(body.endLng),
        city: sanitizeText(body.city, 80) || null,
        sport: sanitizeText(body.sport, 40) || 'running',
        createdBy: user.id,
      }),
    );
  }
}
