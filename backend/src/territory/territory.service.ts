import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TerritoryCell } from './entities/territory-cell.entity';
import { User } from '../users/entities/user.entity';

// Tamanho da célula em graus (~130m no equador). Ajustável.
const CELL_DEG = 0.0012;

/** Cor determinística (hsl) a partir do id do usuário — estável entre sessões. */
function colorForUser(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 360;
  }
  return `hsl(${h}, 75%, 52%)`;
}

function cellIndex(value: number): number {
  return Math.round(value / CELL_DEG);
}

@Injectable()
export class TerritoryService {
  constructor(
    @InjectRepository(TerritoryCell)
    private readonly cellRepo: Repository<TerritoryCell>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** Garante que o usuário tem uma cor de território e retorna ela. */
  private async ensureColor(userId: string): Promise<{ color: string; name: string }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'name', 'territoryColor'],
    });
    const name = user?.name || 'Atleta';
    let color = user?.territoryColor || '';
    if (!color) {
      color = colorForUser(userId);
      await this.userRepo.update(userId, { territoryColor: color }).catch(() => {});
    }
    return { color, name };
  }

  /**
   * Conquista as células por onde o usuário passou.
   * points: lista de {lat,lng} (rota do treino ou ponto atual).
   * Retorna quantas foram conquistadas e quantas foram roubadas de outros.
   */
  async claim(
    userId: string,
    points: { lat: number; lng: number }[],
  ): Promise<{ claimed: number; stolen: number; totalOwned: number }> {
    if (!Array.isArray(points) || points.length === 0) {
      const totalOwned = await this.cellRepo.count({ where: { ownerId: userId } });
      return { claimed: 0, stolen: 0, totalOwned };
    }

    const { color, name } = await this.ensureColor(userId);

    // Deduplica células
    const cellMap = new Map<string, { lat: number; lng: number }>();
    for (const p of points) {
      if (
        typeof p?.lat !== 'number' || typeof p?.lng !== 'number' ||
        !isFinite(p.lat) || !isFinite(p.lng) ||
        p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180
      ) continue;
      const li = cellIndex(p.lat);
      const gi = cellIndex(p.lng);
      const id = `${li}_${gi}`;
      if (!cellMap.has(id)) {
        cellMap.set(id, { lat: li * CELL_DEG, lng: gi * CELL_DEG });
      }
    }
    const ids = [...cellMap.keys()];
    if (ids.length === 0) {
      const totalOwned = await this.cellRepo.count({ where: { ownerId: userId } });
      return { claimed: 0, stolen: 0, totalOwned };
    }
    // Limite de segurança por chamada
    const limitedIds = ids.slice(0, 2000);

    // Busca as células existentes nesse conjunto
    const existing = await this.cellRepo.findByIds(limitedIds);
    const existingMap = new Map(existing.map((c) => [c.cellId, c]));

    let claimed = 0;
    let stolen = 0;
    const toSave: TerritoryCell[] = [];

    for (const id of limitedIds) {
      const center = cellMap.get(id)!;
      const cur = existingMap.get(id);
      if (!cur) {
        const cell = this.cellRepo.create({
          cellId: id,
          ownerId: userId,
          ownerName: name,
          ownerColor: color,
          lat: center.lat,
          lng: center.lng,
          claimCount: 1,
        });
        toSave.push(cell);
        claimed++;
      } else if (cur.ownerId !== userId) {
        cur.ownerId = userId;
        cur.ownerName = name;
        cur.ownerColor = color;
        cur.claimCount = (cur.claimCount || 1) + 1;
        toSave.push(cur);
        stolen++;
        claimed++;
      }
      // se já é dono, não faz nada
    }

    if (toSave.length > 0) {
      await this.cellRepo.save(toSave, { chunk: 200 });
    }

    const totalOwned = await this.cellRepo.count({ where: { ownerId: userId } });
    return { claimed, stolen, totalOwned };
  }

  /** Células dentro de uma bounding box (viewport do mapa). */
  async cellsInBox(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
  ): Promise<TerritoryCell[]> {
    if (![minLat, minLng, maxLat, maxLng].every((n) => typeof n === 'number' && isFinite(n))) {
      return [];
    }
    return this.cellRepo.find({
      where: {
        lat: Between(Math.min(minLat, maxLat), Math.max(minLat, maxLat)),
        lng: Between(Math.min(minLng, maxLng), Math.max(minLng, maxLng)),
      },
      take: 3000,
    });
  }

  /** Top usuários por número de células conquistadas. */
  async leaderboard(limit = 10) {
    const rows = await this.cellRepo
      .createQueryBuilder('c')
      .select('c.ownerId', 'ownerId')
      .addSelect('c.ownerName', 'ownerName')
      .addSelect('c.ownerColor', 'ownerColor')
      .addSelect('COUNT(*)', 'cells')
      .groupBy('c.ownerId')
      .addGroupBy('c.ownerName')
      .addGroupBy('c.ownerColor')
      .orderBy('cells', 'DESC')
      .limit(limit)
      .getRawMany<{ ownerId: string; ownerName: string; ownerColor: string; cells: string }>();

    return rows.map((r, i) => ({
      position: i + 1,
      userId: r.ownerId,
      name: r.ownerName,
      color: r.ownerColor,
      cells: parseInt(r.cells, 10),
    }));
  }

  async myStats(userId: string) {
    const cells = await this.cellRepo.count({ where: { ownerId: userId } });
    // posição no ranking
    const all = await this.leaderboard(1000);
    const me = all.find((u) => u.userId === userId);
    return { cells, position: me?.position ?? null, color: colorForUser(userId) };
  }
}
