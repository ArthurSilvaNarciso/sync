import { DataSource } from 'typeorm';
import * as path from 'path';

/**
 * DataSource usado APENAS pela CLI do TypeORM (geração / execução de migrations).
 * O bootstrap normal usa `databaseConfig()` em app.module.ts.
 *
 * Comandos disponíveis (com tsx/ts-node):
 *
 *   npm run migration:generate -- src/migrations/AddSomething
 *   npm run migration:run
 *   npm run migration:revert
 *
 * Em produção (Railway), DB_SYNCHRONIZE pode ser desligado e as migrations
 * rodam automaticamente (migrationsRun no databaseConfig).
 */
const isProduction = process.env.NODE_ENV === 'production';

const baseEntities = [path.join(__dirname, '..', '**', '*.entity{.ts,.js}')];
const migrationsPath = [path.join(__dirname, '..', 'migrations', '*{.ts,.js}')];

let options: any;

if (isProduction || process.env.DATABASE_URL) {
  options = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: baseEntities,
    migrations: migrationsPath,
    ssl:
      process.env.DB_SSL === 'true' || !!process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false,
    synchronize: false,
    logging: ['error', 'warn'],
  };
} else {
  options = {
    type: 'better-sqlite3',
    database: path.join(__dirname, '..', '..', 'sync_dev.db'),
    entities: baseEntities,
    migrations: migrationsPath,
    synchronize: false,
    logging: false,
  };
}

export const AppDataSource = new DataSource(options);
export default AppDataSource;
