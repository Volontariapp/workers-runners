import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { JobMessagingType } from '@volontariapp/messaging';
import {
  EntityType,
  FileStatus,
  PostgresFileRepository,
  RejectionReason,
  ScanStatus,
  ValidationMode,
} from '@volontariapp/domain-storage';
import { StoragePipelineService } from '@volontariapp/storage-pipeline';
import type { JobOf } from '@volontariapp/workers';
import { ScanFileHandler } from './scan-file.handler.js';

describe('ScanFileHandler (Unit)', () => {
  let fileRepository: jest.Mocked<PostgresFileRepository>;
  let storagePipelineService: jest.Mocked<StoragePipelineService>;
  let s3ClientMock: { deletePublicObject: jest.Mock<any> };
  let handler: ScanFileHandler;

  beforeEach(() => {
    s3ClientMock = {
      deletePublicObject: jest.fn<any>().mockResolvedValue(undefined),
    };

    fileRepository = {
      findById: jest.fn<any>(),
      completeScan: jest.fn<any>(),
      rejectScan: jest.fn<any>(),
    } as unknown as jest.Mocked<PostgresFileRepository>;

    storagePipelineService = {
      processFile: jest.fn<any>(),
      getS3Client: jest.fn<any>().mockReturnValue(s3ClientMock),
    } as unknown as jest.Mocked<StoragePipelineService>;

    handler = new ScanFileHandler(fileRepository, storagePipelineService);
  });

  const makeJob = (fileId: string): JobOf<typeof JobMessagingType.SCAN_FILE> =>
    ({
      id: 'job-123',
      name: JobMessagingType.SCAN_FILE,
      data: {
        id: 'job-123',
        type: JobMessagingType.SCAN_FILE,
        payload: { fileId },
      },
    }) as unknown as JobOf<typeof JobMessagingType.SCAN_FILE>;

  const makeFile = (overrides = {}) => ({
    id: 'file-123',
    ownerId: 'owner-123',
    entityType: EntityType.POST_MEDIA,
    entityId: null,
    declaredMimeType: 'image/jpeg',
    declaredSize: 1024,
    status: FileStatus.PENDING,
    scanStatus: ScanStatus.SCANNING,
    validationMode: ValidationMode.ASYNC,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  it('should skip job if file is not found in database', async () => {
    const job = makeJob('missing-file');
    fileRepository.findById.mockResolvedValue(null);

    const result = await handler.handle(job);

    expect(fileRepository.findById).toHaveBeenCalledWith('missing-file');
    expect(storagePipelineService.processFile).not.toHaveBeenCalled();
    expect(result).toEqual({ originalPayload: job.data.payload });
  });

  it('should skip job if file is not in SCANNING status', async () => {
    const job = makeJob('file-123');
    fileRepository.findById.mockResolvedValue(
      makeFile({ scanStatus: ScanStatus.CLEAN }) as any,
    );

    const result = await handler.handle(job);

    expect(storagePipelineService.processFile).not.toHaveBeenCalled();
    expect(result).toEqual({ originalPayload: job.data.payload });
  });

  it('should skip job if file is ORPHANED or DELETED', async () => {
    const job = makeJob('file-123');
    fileRepository.findById.mockResolvedValue(
      makeFile({ status: FileStatus.ORPHANED }) as any,
    );

    const result = await handler.handle(job);

    expect(storagePipelineService.processFile).not.toHaveBeenCalled();
    expect(result).toEqual({ originalPayload: job.data.payload });
  });

  it('should call rejectScan when storage pipeline rejects the file', async () => {
    const job = makeJob('file-123');
    const file = makeFile();
    fileRepository.findById.mockResolvedValue(file as any);
    storagePipelineService.processFile.mockResolvedValue({
      status: 'REJECTED',
      rejectionReason: RejectionReason.MALWARE,
      details: { virusName: 'Eicar-Signature' },
    } as any);
    fileRepository.rejectScan.mockResolvedValue({} as any);

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
    const job = makeJob('file-123');
    const file = makeFile();
    fileRepository.findById.mockResolvedValue(file as any);
    storagePipelineService.processFile.mockResolvedValue({
      status: 'CLEAN',
      publicKey: 'post/file-123.webp',
      publicUrl: 'http://localhost:9000/volontariapp-public/post/file-123.webp',
      actualSize: 800,
      originalSize: 1024,
      format: 'webp',
      mimeType: 'image/webp',
    } as any);
    fileRepository.completeScan.mockResolvedValue({
      id: file.id,
      status: FileStatus.PENDING,
    } as any);

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
    const job = makeJob('file-123');
    const file = makeFile();
    fileRepository.findById.mockResolvedValue(file as any);
    storagePipelineService.processFile.mockResolvedValue({
      status: 'CLEAN',
      publicKey: 'post/file-123.webp',
      publicUrl: 'http://localhost:9000/volontariapp-public/post/file-123.webp',
    } as any);
    fileRepository.completeScan.mockResolvedValue(null);

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

