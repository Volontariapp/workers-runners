import {
  EntityType,
  FileModel,
  FileStatus,
  ScanStatus,
  ValidationMode,
} from '@volontariapp/domain-storage';

export const buildFileModel = (
  overrides: Partial<FileModel> = {},
): FileModel => {
  const file = new FileModel();
  file.id = '11111111-1111-4111-a111-111111111111';
  file.ownerId = '22222222-2222-4222-a222-222222222222';
  file.entityType = EntityType.POST;
  file.entityId = null;
  file.status = FileStatus.PENDING;
  file.scanStatus = ScanStatus.SCANNING;
  file.rejectionReason = null;
  file.declaredMimeType = 'image/jpeg';
  file.declaredSize = 1024;
  file.actualSize = null;
  file.quarantineKey = 'quarantine/11111111-1111-4111-a111-111111111111';
  file.publicKey = null;
  file.scanAttempts = 0;
  file.rescanScheduledAt = null;
  file.validationMode = ValidationMode.ASYNC;
  file.uploadExpiresAt = new Date(Date.now() + 3600 * 1000);
  file.confirmedAt = new Date();
  file.scannedAt = null;
  file.reservedAt = new Date();
  file.attachedAt = null;
  file.createdAt = new Date();
  file.updatedAt = new Date();

  return Object.assign(file, overrides);
};
