import { createMock } from '@volontariapp/testing';
import type { jest } from '@jest/globals';
import type { TransactionManager } from '@volontariapp/domain-ranking';

/** Gestionnaire de transaction passe au rappel afterWrite de replaceList. */
export const createMockEntityManager = (): jest.Mocked<TransactionManager> =>
  createMock<TransactionManager>();
