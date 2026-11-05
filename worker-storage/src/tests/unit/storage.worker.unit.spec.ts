import { describe, it, expect, beforeEach } from '@jest/globals';
import type { JobMessagingType } from '@volontariapp/messaging';
import type { JobAuditRepository, JobOf } from '@volontariapp/workers';
import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import { StorageWorker } from '../../workers/storage.worker.js';
import type { ScanFileHandler } from '../../workers/handlers/scan-file.handler.js';
import type { CleanupFilesHandler } from '../../workers/handlers/cleanup-files.handler.js';
import {
  buildCleanupFilesJob,
  buildScanFileJob,
} from '../factories/job.factory.js';
import {
  createMockJobAuditRepository,
  createMockCleanupFilesHandler,
  createMockScanFileHandler,
} from '../mocks/storage.mock.js';

describe('StorageWorker (Unit)', () => {
  let auditRepo: jest.Mocked<JobAuditRepository>;
  let scanFileHandler: jest.Mocked<ScanFileHandler>;
  let cleanupFilesHandler: jest.Mocked<CleanupFilesHandler>;
  let worker: StorageWorker;

  beforeEach(() => {
    auditRepo = createMockJobAuditRepository();
    scanFileHandler = createMockScanFileHandler();

    cleanupFilesHandler = createMockCleanupFilesHandler();

    worker = new StorageWorker(auditRepo, scanFileHandler, cleanupFilesHandler);
  });

  it('should route storage.scan_file to ScanFileHandler', async () => {
    // Arrange
    const payload = { fileId: '11111111-1111-4111-a111-111111111111' };
    const job = buildScanFileJob(payload.fileId);

    scanFileHandler.handle.mockResolvedValue({ originalPayload: payload });

    // Act
    const result = await worker['processJob'](job);

    // Assert
    expect(scanFileHandler.handle).toHaveBeenCalledWith(job);
    expect(result).toEqual({ originalPayload: payload });
  });

  it('should route storage.cleanup_files to CleanupFilesHandler', async () => {
    const job = buildCleanupFilesJob();
    cleanupFilesHandler.handle.mockResolvedValue({ originalPayload: {} });

    const result = await worker['processJob'](job);

    expect(cleanupFilesHandler.handle).toHaveBeenCalledWith(job);
    expect(scanFileHandler.handle).not.toHaveBeenCalled();
    expect(result).toEqual({ originalPayload: {} });
  });

  it('should throw an error for unhandled job type', async () => {
    // Arrange
    const job = createMock<JobOf<JobMessagingType>>();
    Object.defineProperty(job, 'id', { value: 'job-unhandled' });
    Object.defineProperty(job, 'name', { value: 'unknown.job' });

    // Act & Assert
    await expect(worker['processJob'](job)).rejects.toThrow(
      'Unhandled job type: unknown.job',
    );
  });
});
