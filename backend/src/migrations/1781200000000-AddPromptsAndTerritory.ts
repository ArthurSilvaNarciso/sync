import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adiciona:
 *  - users.prompts (frases estilo Tinder, JSON em text)
 *  - users.territoryColor (cor do território)
 *  - tabela territory_cells (jogo de conquista de território)
 *
 * Idempotente (IF NOT EXISTS) — seguro de rodar mesmo se o synchronize já
 * tiver criado parte do schema. Roda automaticamente em produção quando
 * DB_SYNCHRONIZE != 'true' (migrationsRun). Postgres.
 */
export class AddPromptsAndTerritory1781200000000 implements MigrationInterface {
  name = 'AddPromptsAndTerritory1781200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "prompts" text`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "territoryColor" character varying(30)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "territory_cells" (
        "cellId" character varying(40) NOT NULL,
        "ownerId" character varying(64) NOT NULL,
        "ownerName" character varying(100) NOT NULL,
        "ownerColor" character varying(30) NOT NULL,
        "lat" real NOT NULL,
        "lng" real NOT NULL,
        "claimCount" integer NOT NULL DEFAULT 1,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_territory_cells_cellId" PRIMARY KEY ("cellId")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_territory_owner" ON "territory_cells" ("ownerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_territory_lat" ON "territory_cells" ("lat")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_territory_lng" ON "territory_cells" ("lng")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "territory_cells"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "territoryColor"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "prompts"`);
  }
}
