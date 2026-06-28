import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Segment } from './segment.entity';
import { SegmentEffort } from './segment-effort.entity';
import { haversineMeters } from '../common/utils/haversine';

type GpsPoint = { latitude: number; longitude: number; timestamp: Date | string };

// Tolerância (metros) para considerar que o atleta "passou" pelo start/end.
const MATCH_RADIUS_M = 35;

@Injectable()
export class SegmentsMatchService {
  private readonly logger = new Logger('SegmentsMatch');

  constructor(
    @InjectRepository(Segment) private readonly segments: Repository<Segment>,
    @InjectRepository(SegmentEffort) private readonly efforts: Repository<SegmentEffort>,
  ) {}

  /**
   * Cronometra automaticamente os segments cobertos por uma atividade.
   * Para cada segment próximo: acha o ponto da rota mais perto do START e,
   * DEPOIS dele no tempo, o mais perto do END; se ambos caem dentro do raio,
   * registra um effort com o tempo entre eles. Best-effort, nunca lança.
   */
  async matchActivity(userId: string, activityId: string, points: GpsPoint[]): Promise<number> {
    try {
      if (!Array.isArray(points) || points.length < 2) return 0;

      // Ordena por tempo (defensivo) e normaliza timestamps
      const pts = points
        .map((p) => ({
          lat: Number(p.latitude),
          lng: Number(p.longitude),
          t: new Date(p.timestamp).getTime(),
        }))
        .filter((p) => isFinite(p.lat) && isFinite(p.lng) && isFinite(p.t))
        .sort((a, b) => a.t - b.t);
      if (pts.length < 2) return 0;

      // Bounding box da atividade + folga, pra buscar só segments relevantes
      const lats = pts.map((p) => p.lat);
      const lngs = pts.map((p) => p.lng);
      const pad = 0.01; // ~1.1 km
      const candidates = await this.segments
        .createQueryBuilder('s')
        .where('s.startLat BETWEEN :latMin AND :latMax', {
          latMin: Math.min(...lats) - pad,
          latMax: Math.max(...lats) + pad,
        })
        .andWhere('s.startLng BETWEEN :lngMin AND :lngMax', {
          lngMin: Math.min(...lngs) - pad,
          lngMax: Math.max(...lngs) + pad,
        })
        .limit(100)
        .getMany();

      let matched = 0;
      for (const seg of candidates) {
        // Já existe effort desta atividade neste segment? (idempotência)
        const dup = await this.efforts.findOne({ where: { segmentId: seg.id, activityId } });
        if (dup) continue;

        // Índice do ponto mais perto do START
        let startIdx = -1;
        let startBest = MATCH_RADIUS_M;
        for (let i = 0; i < pts.length; i++) {
          const d = haversineMeters(pts[i].lat, pts[i].lng, seg.startLat, seg.startLng);
          if (d < startBest) { startBest = d; startIdx = i; }
        }
        if (startIdx < 0) continue;

        // Ponto mais perto do END, mas DEPOIS do start no tempo
        let endIdx = -1;
        let endBest = MATCH_RADIUS_M;
        for (let i = startIdx + 1; i < pts.length; i++) {
          const d = haversineMeters(pts[i].lat, pts[i].lng, seg.endLat, seg.endLng);
          if (d < endBest) { endBest = d; endIdx = i; }
        }
        if (endIdx < 0) continue;

        const elapsedSec = Math.round((pts[endIdx].t - pts[startIdx].t) / 1000);
        if (elapsedSec < 1 || elapsedSec > 86_400) continue;

        await this.efforts.save(
          this.efforts.create({ segmentId: seg.id, userId, activityId, elapsedSec }),
        );
        seg.attemptsCount = (seg.attemptsCount || 0) + 1;
        if (seg.bestTimeSec == null || elapsedSec < seg.bestTimeSec) {
          seg.bestTimeSec = elapsedSec;
          seg.bestUserId = userId;
        }
        await this.segments.save(seg);
        matched++;
      }
      return matched;
    } catch (e: any) {
      this.logger.warn(`matchActivity falhou: ${e?.message || e}`);
      return 0;
    }
  }
}
