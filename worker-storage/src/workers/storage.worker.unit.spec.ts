import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { JobMessagingType } from '@volontariapp/messaging';
import type { JobAuditRepository, JobOf } from '@volontariapp/workers';
import { StorageWorker } from './storage.worker.js';
import { ScanFileHandler } from './handlers/scan-file.handler.js';

describe('StorageWorker (Unit)', () => {
  let auditRepo: jest.Mocked<JobAuditRepository>;
  let scanFileHandler: jest.Mocked<ScanFileHandler>;
  let worker: StorageWorker;

  beforeEach(() => {
    auditRepo = {
      recordProcessing: jest.fn<any>().mockResolvedValue({ id: 'audit-1' }),
      recordSuccess: jest.fn<any>().mockResolvedValue(undefined),
      recordFailure: jest.fn<any>().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<JobAuditRepository>;

    scanFileHandler = {
      jobType: JobMessagingType.SCAN_FILE,
      handle: jest.fn<any>(),
    } as unknown as jest.Mocked<ScanFileHandler>;

    worker = new StorageWorker(auditRepo, scanFileHandler);
  });

  it('should route storage.scan_file to ScanFileHandler', async () => {
    // Arrange
    const payload = { fileId: '11111111-1111-4111-a111-111111111111' };
    const job = {
      id: 'job-1',
      name: JobMessagingType.SCAN_FILE,
      data: {
        id: 'job-1',
        type: JobMessagingType.SCAN_FILE,
        payload,
      },
    } as unknown as JobOf<JobMessagingType>;

    scanFileHandler.handle.mockResolvedValue({ originalPayload: payload });

    // Act
    // processJob is protected, we can test it directly via worker['processJob']
    const result = await worker['processJob'](job);

    // Assert
    expect(scanFileHandler.handle).toHaveBeenCalledWith(job);
    expect(result).toEqual({ originalPayload: payload });
  });

  it('should throw an error for unhandled job type', async () => {
    // Arrange
    const job = {
      id: 'job-2',
      name: 'unknown.job' as any,
      data: {
        id: 'job-2',
        type: 'unknown.job' as any,
        payload: {},
      },
    } as unknown as JobOf<JobMessagingType>;

    // Act & Assert
    await expect(worker['processJob'](job)).rejects.toThrow(
      'Unhandled job type: unknown.job',
    );
  });
});

