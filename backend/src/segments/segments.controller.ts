import { Controller, Get, Post, Body, Query, UseGuards, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Segment } from './segment.entity';
import { SegmentEffort } from './segment-effort.entity';
import { sanitizeText } from '../common/security/sanitize.util';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@ApiTags('Segments')
@Controller('api/segments')
export class SegmentsController {
  constructor(
    @InjectRepository(Segment) private readonly repo: Repository<Segment>,
    @InjectRepository(SegmentEffort) private readonly efforts: Repository<SegmentEffort>,
    private readonly notifications: NotificationsService,
  ) {}

  /** Notifica o antigo dono do KOM que perdeu o trono (best-effort, nunca lança). */
  private async notifyKomStolen(
    segment: Segment,
    previousBestUserId: string | null,
    newUserId: string,
    newTimeSec: number,
  ) {
    try {
      if (!previousBestUserId || previousBestUserId === newUserId) return;
      const stealer = await this.repo.manager
        .getRepository(User)
        .findOne({ where: { id: newUserId }, select: ['id', 'name'] });
      const who = stealer?.name || 'Outro atleta';
      await this.notifications.create(
        previousBestUserId,
        NotificationType.KOM_STOLEN,
        '👑 Seu KOM foi roubado!',
        `${who} fez um tempo melhor no segmento "${segment.name}". Bora recuperar?`,
        JSON.stringify({ segmentId: segment.id, newTimeSec }),
      );
    } catch {
      /* noop */
    }
  }

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

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Leaderboard do segment (melhor tempo por atleta)' })
  async leaderboard(@Param('id') id: string) {
    // Melhor tempo de cada atleta neste trecho, do mais rápido pro mais lento.
    const rows = await this.efforts
      .createQueryBuilder('e')
      .select('e.user_id', 'userId')
      .addSelect('MIN(e.elapsed_sec)', 'bestSec')
      .addSelect('COUNT(e.id)', 'tries')
      .where('e.segment_id = :id', { id })
      .groupBy('e.user_id')
      .orderBy('"bestSec"', 'ASC')
      .limit(50)
      .getRawMany<{ userId: string; bestSec: string; tries: string }>();

    if (rows.length === 0) return [];

    // Carrega só os campos públicos dos atletas do ranking
    const ids = rows.map((r) => r.userId);
    const users = await this.repo.manager
      .getRepository(User)
      .createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.avatarUrl', 'u.city', 'u.level'])
      .where('u.id IN (:...ids)', { ids })
      .getMany();
    const byId = new Map(users.map((u) => [u.id, u]));

    return rows.map((r, i) => {
      const u = byId.get(r.userId);
      return {
        rank: i + 1,
        userId: r.userId,
        name: u?.name || 'Atleta',
        avatarUrl: (u as any)?.avatarUrl || null,
        city: (u as any)?.city || null,
        level: (u as any)?.level || null,
        elapsedSec: parseInt(r.bestSec, 10),
        tries: parseInt(r.tries, 10),
        isKOM: i === 0, // líder = KOM/QOM
      };
    });
  }

  @Post(':id/effort')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar um tempo (effort) no segment' })
  async recordEffort(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { elapsedSec: number; activityId?: string },
  ) {
    const segment = await this.repo.findOne({ where: { id } });
    if (!segment) throw new BadRequestException('Segment não encontrado');

    // Clamp tempo: 1s a 24h (evita lixo)
    const sec = Math.round(Math.max(1, Math.min(86_400, Number(body.elapsedSec) || 0)));
    if (!isFinite(sec) || sec < 1) throw new BadRequestException('Tempo inválido');

    // Melhor tempo anterior DESTE atleta (pra detectar PR pessoal)
    const myPrev = await this.efforts
      .createQueryBuilder('e')
      .select('MIN(e.elapsed_sec)', 'best')
      .where('e.segment_id = :id AND e.user_id = :uid', { id, uid: user.id })
      .getRawOne<{ best: string | null }>();
    const myPrevBest = myPrev?.best != null ? parseInt(myPrev.best, 10) : null;

    await this.efforts.save(
      this.efforts.create({
        segmentId: id,
        userId: user.id,
        activityId: body.activityId || null,
        elapsedSec: sec,
      }),
    );

    // Atualiza contadores e KOM/QOM do segment
    segment.attemptsCount = (segment.attemptsCount || 0) + 1;
    const previousBestUserId = segment.bestUserId;
    const isKOM = segment.bestTimeSec == null || sec < segment.bestTimeSec;
    if (isKOM) {
      segment.bestTimeSec = sec;
      segment.bestUserId = user.id;
    }
    await this.repo.save(segment);

    // Roubou o KOM de alguém? Avisa o antigo dono (fire-and-forget)
    if (isKOM) {
      this.notifyKomStolen(segment, previousBestUserId, user.id, sec).catch(() => {});
    }

    const isPR = myPrevBest == null || sec < myPrevBest;
    return { ok: true, isPR, isKOM, elapsedSec: sec, myPrevBest };
  }
}
