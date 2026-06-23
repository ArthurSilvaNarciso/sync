import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

// Lista de CPFs banidos — guarda só o HASH (SHA-256), nunca o CPF cru (LGPD).
// Usada no cadastro para impedir que alguém banido crie outra conta.
@Entity('banned_cpfs')
export class BannedCpf {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  cpfHash: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
