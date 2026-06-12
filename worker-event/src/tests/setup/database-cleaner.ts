import type { PostgresProvider } from '@volontariapp/bridge';

export class DatabaseCleaner {
  constructor(private readonly postgresProvider: PostgresProvider) {}

  /**
   * Clears all data from all tables in the public schema except the migrations table.
   * Useful for ensuring tests run in isolation.
   */
  async clearAllTables(): Promise<void> {
    const datasource = this.postgresProvider.getDriver();
    const queryRunner = datasource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Get all table names in the public schema
      const tables = (await queryRunner.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename != 'migrations';
      `)) as Array<{ tablename: string }>;

      if (tables.length > 0) {
        // TRUNCATE CASCADE will efficiently delete all data including foreign keys
        const tableNames = tables.map((t) => `"${t.tablename}"`).join(', ');
        await queryRunner.query(`TRUNCATE TABLE ${tableNames} CASCADE;`);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
