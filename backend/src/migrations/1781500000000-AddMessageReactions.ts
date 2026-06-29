import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reações em mensagens do chat: coluna jsonb `reactions` (mapa emoji -> userIds).
 * Idempotente (IF NOT EXISTS). Roda automática em prod (migrationsRun). Postgres.
 */
export class AddMessageReactions1781500000000 implements MigrationInterface {
  name = 'AddMessageReactions1781500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "reactions" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "reactions"`);
  }
}
