import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lista de banidos por CPF (anti-reincidência).
 *  - users.cpfHash: hash SHA-256 do CPF do usuário (nunca o CPF cru).
 *  - banned_cpfs: hashes de CPF banidos; barra recriação de conta.
 *
 * Idempotente (IF NOT EXISTS). Roda automática em prod (migrationsRun). Postgres.
 */
export class AddCpfBanList1781300000000 implements MigrationInterface {
  name = 'AddCpfBanList1781300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cpfHash" character varying(64)`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "banned_cpfs" (
        "cpfHash" character varying(64) NOT NULL,
        "reason" character varying(200),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_banned_cpfs_hash" PRIMARY KEY ("cpfHash")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "banned_cpfs"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "cpfHash"`);
  }
}
