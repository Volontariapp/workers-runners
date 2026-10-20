import { describe, it, expect, beforeEach } from '@jest/globals';
import type { PostgresFileRepository } from '@volontariapp/domain-storage';
import {
  FileStatus,
  RejectionReason,
  ScanStatus,
} from '@volontariapp/domain-storage';
import type {
  StoragePipelineService,
  S3StorageClient,
} from '@volontariapp/storage-pipeline';
import type { jest } from '@jest/globals';
import { ScanFileHandler } from '../../workers/handlers/scan-file.handler.js';
import { buildFileModel } from '../factories/file.factory.js';
import { buildScanFileJob } from '../factories/job.factory.js';
import {
  createMockFileRepository,
  createMockS3StorageClient,
  createMockStoragePipelineService,
} from '../mocks/storage.mock.js';

describe('ScanFileHandler (Unit)', () => {
  let fileRepository: jest.Mocked<PostgresFileRepository>;
  let s3ClientMock: jest.Mocked<S3StorageClient>;
  let storagePipelineService: jest.Mocked<StoragePipelineService>;
  let handler: ScanFileHandler;

  beforeEach(() => {
    fileRepository = createMockFileRepository();
    s3ClientMock = createMockS3StorageClient();
    storagePipelineService = createMockStoragePipelineService(s3ClientMock);

    handler = new ScanFileHandler(fileRepository, storagePipelineService);
  });

  it('should skip job if file is not found in database', async () => {
    const job = buildScanFileJob('missing-file');
    fileRepository.findById.mockResolvedValue(null);

    const result = await handler.handle(job);

    expect(fileRepository.findById).toHaveBeenCalledWith('missing-file');
    expect(storagePipelineService.processFile).not.toHaveBeenCalled();
    expect(result).toEqual({ originalPayload: job.data.payload });
  });

  it('should skip job if file is not in SCANNING status', async () => {
    const job = buildScanFileJob('file-123');
    fileRepository.findById.mockResolvedValue(
      buildFileModel({ id: 'file-123', scanStatus: ScanStatus.CLEAN }),
    );

    const result = await handler.handle(job);

    expect(storagePipelineService.processFile).not.toHaveBeenCalled();
    expect(result).toEqual({ originalPayload: job.data.payload });
  });

  it('should skip job if file is ORPHANED or DELETED', async () => {
    const job = buildScanFileJob('file-123');
    fileRepository.findById.mockResolvedValue(
      buildFileModel({ id: 'file-123', status: FileStatus.ORPHANED }),
    );

    const result = await handler.handle(job);

    expect(storagePipelineService.processFile).not.toHaveBeenCalled();
    expect(result).toEqual({ originalPayload: job.data.payload });
  });

  it('should call rejectScan when storage pipeline rejects the file', async () => {
    const job = buildScanFileJob('file-123');
    const file = buildFileModel({ id: 'file-123' });
    fileRepository.findById.mockResolvedValue(file);
    storagePipelineService.processFile.mockResolvedValue({
      status: 'REJECTED',
      rejectionReason: RejectionReason.MALWARE,
      details: { virusName: 'Eicar-Signature' },
    });
    fileRepository.rejectScan.mockResolvedValue(
      buildFileModel({ id: 'file-123', scanStatus: ScanStatus.REJECTED }),
    );

    const result = await handler.handle(job);

    expect(storagePipelineService.processFile).toHaveBeenCalledWith({
      fileId: file.id,
      entityType: file.entityType,
      declaredMimeType: file.declaredMimeType,
      declaredSize: file.declaredSize,
    });
    expect(fileRepository.rejectScan).toHaveBeenCalledWith({
      fileId: file.id,
      reason: RejectionReason.MALWARE,
    });
    expect(fileRepository.completeScan).not.toHaveBeenCalled();
    expect(result).toEqual({ originalPayload: job.data.payload });
  });

  it('should call completeScan when storage pipeline succeeds with CLEAN status', async () => {
    const job = buildScanFileJob('file-123');
    const file = buildFileModel({ id: 'file-123' });
    fileRepository.findById.mockResolvedValue(file);
    storagePipelineService.processFile.mockResolvedValue({
      status: 'CLEAN',
      publicKey: 'post/file-123.webp',
      publicUrl: 'http://localhost:9000/volontariapp-public/post/file-123.webp',
      actualSize: 800,
      originalSize: 1024,
      format: 'webp',
      mimeType: 'image/webp',
      width: 800,
      height: 600,
    });
    fileRepository.completeScan.mockResolvedValue(
      buildFileModel({
        id: file.id,
        status: FileStatus.PENDING,
        scanStatus: ScanStatus.CLEAN,
        publicKey: 'post/file-123.webp',
      }),
    );

    const result = await handler.handle(job);

    expect(storagePipelineService.processFile).toHaveBeenCalled();
    expect(fileRepository.completeScan).toHaveBeenCalledWith({
      fileId: file.id,
      publicKey: 'post/file-123.webp',
    });
    expect(s3ClientMock.deletePublicObject).not.toHaveBeenCalled();
    expect(result).toEqual({ originalPayload: job.data.payload });
  });

  it('should clean up public S3 object if completeScan returns null (file released concurrently)', async () => {
    const job = buildScanFileJob('file-123');
    const file = buildFileModel({ id: 'file-123' });
    fileRepository.findById.mockResolvedValue(file);
    storagePipelineService.processFile.mockResolvedValue({
      status: 'CLEAN',
      publicKey: 'post/file-123.webp',
      publicUrl: 'http://localhost:9000/volontariapp-public/post/file-123.webp',
      actualSize: 800,
      originalSize: 1024,
      format: 'webp',
      mimeType: 'image/webp',
      width: 800,
      height: 600,
    });
    fileRepository.completeScan.mockResolvedValue(null);
    s3ClientMock.deletePublicObject.mockResolvedValue(undefined);

    const result = await handler.handle(job);

    expect(fileRepository.completeScan).toHaveBeenCalledWith({
      fileId: file.id,
      publicKey: 'post/file-123.webp',
    });
    expect(s3ClientMock.deletePublicObject).toHaveBeenCalledWith(
      'post/file-123.webp',
    );
    expect(result).toEqual({ originalPayload: job.data.payload });
  });
});
