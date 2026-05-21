import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';

// SQLite para dev. PostgreSQL para produção.
// Railway/Render injetam DATABASE_URL (preferida) ou DB_* separados.
export const databaseConfig = (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!process.env.DB_PASSWORD && !process.env.DATABASE_URL) {
      // eslint-disable-next-line no-console
      console.warn('[DB] Atenção: nenhuma credencial de DB configurada em produção.');
    }

    // Opt-in: primeiro deploy usa DB_SYNCHRONIZE=true pra criar o schema.
    // Depois desligue e use migrations.
    const synchronize = process.env.DB_SYNCHRONIZE === 'true';

    const common = {
      type: 'postgres' as const,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      synchronize,
      migrationsRun: !synchronize,
      logging: false,
      ssl: process.env.DB_SSL === 'true' || !!process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false,
    };

    if (process.env.DATABASE_URL) {
      return { ...common, url: process.env.DATABASE_URL };
    }

    return {
      ...common,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sync_db',
    };
  }

  return {
    type: 'better-sqlite3',
    database: path.join(__dirname, '..', '..', 'sync_dev.db'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
    logging: false,
  };
};
