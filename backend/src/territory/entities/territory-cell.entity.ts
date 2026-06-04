import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Célula de território no "jogo de conquista".
 * O mapa é dividido numa grade. Cada célula (~130m) pertence a UM usuário —
 * o último que passou por ela com um treino fica dono (rouba de quem estava).
 * cellId = `${latIdx}_${lngIdx}` (quantizado pela constante CELL_DEG no service).
 */
@Entity('territory_cells')
export class TerritoryCell {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  cellId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  ownerId: string;

  @Column({ type: 'varchar', length: 100 })
  ownerName: string;

  @Column({ type: 'varchar', length: 30 })
  ownerColor: string;

  // Centro da célula (para render no mapa)
  @Index()
  @Column({ type: 'real' })
  lat: number;

  @Index()
  @Column({ type: 'real' })
  lng: number;

  // Quantas vezes a célula já foi conquistada (disputa)
  @Column({ type: 'int', default: 1 })
  claimCount: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
