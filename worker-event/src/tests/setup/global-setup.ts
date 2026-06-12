import { PostgresProvider } from '@volontariapp/bridge';
import { resolveConfigDirectory } from '../../config/resolve-config-directory.js';
import { CustomConfig } from '../../config/custom-config.js';
import type { IPostgresConfig } from '@volontariapp/config';
import { loadConfig } from '@volontariapp/config';
import { instanceToPlain } from 'class-transformer';
import path from 'path';

export default async (): Promise<void> => {
  console.log(
    '\n[Global Setup] Dropping database schema and running migrations...',
  );
  try {
    const configDir = resolveConfigDirectory();
    const config = loadConfig(configDir, CustomConfig);
    const dbConfig = config.db;

    const dbProvider = new PostgresProvider({
      ...(instanceToPlain(dbConfig) as IPostgresConfig),
      entities: [],
      migrations: [path.join(process.cwd(), 'src/migrations/**/*.ts')],
      synchronize: false,
    });

    await dbProvider.connect();
    const datasource = dbProvider.getDriver();
    await datasource.query(`DROP SCHEMA IF EXISTS public CASCADE;`);
    await datasource.query(`CREATE SCHEMA public;`);
    await datasource.runMigrations();

    await dbProvider.disconnect();
    console.log('[Global Setup] Migrations executed successfully.');
  } catch (error) {
    console.error('[Global Setup] Failed to run migrations:', error);
    throw error;
  }
};
