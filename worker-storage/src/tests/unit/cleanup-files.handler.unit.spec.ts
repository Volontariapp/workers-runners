import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import {
  MAX_PURGE_BATCH_SIZE,
  type PostgresFileRepository,
} from '@volontariapp/domain-storage';
import type {
  StoragePipelineService,
  S3StorageClient,
} from '@volontariapp/storage-pipeline';
import {
  CleanupFilesHandler,
  MAX_PURGE_BATCHES_PER_JOB,
} from '../../workers/handlers/cleanup-files.handler.js';
import { buildPurgeCandidate } from '../factories/file.factory.js';
import { buildCleanupFilesJob } from '../factories/job.factory.js';
import {
  createMockFileRepository,
  createMockS3StorageClient,
  createMockStoragePipelineService,
} from '../mocks/storage.mock.js';

describe('CleanupFilesHandler (Unit)', () => {
  let fileRepository: jest.Mocked<PostgresFileRepository>;
  let s3Client: jest.Mocked<S3StorageClient>;
  let pipeline: jest.Mocked<StoragePipelineService>;
  let handler: CleanupFilesHandler;

  beforeEach(() => {
    fileRepository = createMockFileRepository();
    s3Client = createMockS3StorageClient();
    pipeline = createMockStoragePipelineService(s3Client);
    handler = new CleanupFilesHandler(fileRepository, pipeline);
    s3Client.deleteQuarantineObjects.mockResolvedValue(undefined);
    s3Client.deletePublicObjects.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes quarantine and public objects then marks rows deleted', async () => {
    const job = buildCleanupFilesJob();
    fileRepository.listPurgeCandidates
      .mockResolvedValueOnce([
        buildPurgeCandidate('f1', 'post/f1.webp'),
        buildPurgeCandidate('f2'),
      ])
      .mockResolvedValueOnce([]);
    fileRepository.markDeleted.mockResolvedValue(['f1', 'f2']);

    const result = await handler.handle(job);

    expect(fileRepository.listPurgeCandidates).toHaveBeenCalledWith(
      MAX_PURGE_BATCH_SIZE,
    );
    expect(s3Client.deleteQuarantineObjects).toHaveBeenCalledWith(['f1', 'f2']);
    expect(s3Client.deletePublicObjects).toHaveBeenCalledWith(['post/f1.webp']);
    expect(fileRepository.markDeleted).toHaveBeenCalledWith(['f1', 'f2']);
    expect(result).toEqual({ originalPayload: job.data.payload });
  });

  it('does not request public deletion for null publicKey', async () => {
    fileRepository.listPurgeCandidates
      .mockResolvedValueOnce([buildPurgeCandidate('f1')])
      .mockResolvedValueOnce([]);
    fileRepository.markDeleted.mockResolvedValue(['f1']);

    await handler.handle(buildCleanupFilesJob());

    expect(s3Client.deletePublicObjects).toHaveBeenCalledWith([]);
    expect(s3Client.deletePublicObject).not.toHaveBeenCalled();
  });

  it('stops on an empty batch', async () => {
    fileRepository.listPurgeCandidates.mockResolvedValue([]);

    await handler.handle(buildCleanupFilesJob());

    expect(fileRepository.listPurgeCandidates).toHaveBeenCalledTimes(1);
    expect(s3Client.deleteQuarantineObjects).not.toHaveBeenCalled();
    expect(fileRepository.markDeleted).not.toHaveBeenCalled();
  });

  it('stops after MAX_PURGE_BATCHES_PER_JOB batches', async () => {
    fileRepository.listPurgeCandidates.mockResolvedValue([
      buildPurgeCandidate('f1'),
    ]);
    fileRepository.markDeleted.mockResolvedValue(['f1']);

    await handler.handle(buildCleanupFilesJob());

    expect(fileRepository.listPurgeCandidates).toHaveBeenCalledTimes(
      MAX_PURGE_BATCHES_PER_JOB,
    );
    expect(fileRepository.markDeleted).toHaveBeenCalledTimes(
      MAX_PURGE_BATCHES_PER_JOB,
    );
  });

  it('rethrows on S3 error and does not mark rows deleted', async () => {
    fileRepository.listPurgeCandidates.mockResolvedValue([
      buildPurgeCandidate('f1', 'post/f1.webp'),
    ]);
    s3Client.deletePublicObjects.mockRejectedValue(new Error('s3 down'));

    await expect(handler.handle(buildCleanupFilesJob())).rejects.toThrow(
      's3 down',
    );
    expect(fileRepository.markDeleted).not.toHaveBeenCalled();
  });
});
