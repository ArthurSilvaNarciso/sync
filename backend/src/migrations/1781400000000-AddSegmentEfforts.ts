import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Leaderboard de segments (estilo Strava): tabela de "efforts" (tempos por
 * usuário num trecho). O melhor tempo vira KOM/QOM (já refletido em
 * segments.bestTimeSec/best_user_id).
 *
 * Idempotente (IF NOT EXISTS). Roda automática em prod (migrationsRun). Postgres.
 */
export class AddSegmentEfforts1781400000000 implements MigrationInterface {
  name = 'AddSegmentEfforts1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "segment_efforts" (
        "id" uuid NOT NULL,
        "segment_id" character varying NOT NULL,
        "user_id" character varying NOT NULL,
        "activity_id" character varying,
        "elapsed_sec" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_segment_efforts_id" PRIMARY KEY ("id")
      )
    `);
    // Índices para o leaderboard (ordenar por tempo dentro de um segment) e
    // para buscar os efforts de um usuário.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_segment_efforts_seg_time" ON "segment_efforts" ("segment_id", "elapsed_sec")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_segment_efforts_user" ON "segment_efforts" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "segment_efforts"`);
  }
}
