import { createMock } from '@volontariapp/testing';
import { jest } from '@jest/globals';
import type { PostgresProvider } from '@volontariapp/bridge';
import type { DataSource, ObjectLiteral, Repository } from 'typeorm';

/** Source de donnees dont getRepository renvoie un depot TypeORM mocke. */
export const createMockPostgresProvider = (): jest.Mocked<PostgresProvider> => {
  const dataSource = createMock<DataSource>();
  jest
    .spyOn(dataSource, 'getRepository')
    .mockImplementation(() => createMock<Repository<ObjectLiteral>>());
  const provider = createMock<PostgresProvider>();
  jest.spyOn(provider, 'getDriver').mockReturnValue(dataSource);
  return provider;
};
