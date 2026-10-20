import { createMock } from '@volontariapp/testing';
import type { jest } from '@jest/globals';
import { JobMessagingType } from '@volontariapp/messaging';
import type { PostgresFileRepository } from '@volontariapp/domain-storage';
import type {
  StoragePipelineService,
  S3StorageClient,
} from '@volontariapp/storage-pipeline';
import type { JobAuditRepository } from '@volontariapp/workers';
import type { ScanFileHandler } from '../../workers/handlers/scan-file.handler.js';

export const createMockFileRepository =
  (): jest.Mocked<PostgresFileRepository> => {
    return createMock<PostgresFileRepository>();
  };

export const createMockS3StorageClient = (): jest.Mocked<S3StorageClient> => {
  return createMock<S3StorageClient>();
};

export const createMockStoragePipelineService = (
  s3Client?: jest.Mocked<S3StorageClient>,
): jest.Mocked<StoragePipelineService> => {
  const mock = createMock<StoragePipelineService>();
  if (s3Client) {
    mock.getS3Client.mockReturnValue(s3Client);
  }
  return mock;
};

export const createMockJobAuditRepository =
  (): jest.Mocked<JobAuditRepository> => {
    return createMock<JobAuditRepository>();
  };

export const createMockScanFileHandler = (): jest.Mocked<ScanFileHandler> => {
  const mock = createMock<ScanFileHandler>();
  Object.defineProperty(mock, 'jobType', {
    value: JobMessagingType.SCAN_FILE,
    writable: true,
  });
  return mock;
};
