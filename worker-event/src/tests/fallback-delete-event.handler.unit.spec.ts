import { describe, it, expect, beforeEach } from '@jest/globals';
import { UnrecoverableError } from 'bullmq';
import { FallbackDeleteEventHandler } from '../workers/handlers/fallback/fallback-delete-event.handler.js';
import { FallbackDeleteEventFactory } from './factories/fallback-delete-event.factory.js';
import { createEventServiceMock } from './mocks/event-service.mock.js';
import { createFallbackDeleteEventJobMock } from './mocks/fallback-delete-event-job.mock.js';

describe('FallbackDeleteEventHandler (Unit)', () => {
  let eventService: ReturnType<typeof createEventServiceMock>;
  let handler: FallbackDeleteEventHandler;

  beforeEach(() => {
    eventService = createEventServiceMock();
    handler = new FallbackDeleteEventHandler(eventService);
  });

  it('should replay the deletion as the original user, with their role', async () => {
    // Arrange
    const payload = FallbackDeleteEventFactory.buildPayload();
    const job = createFallbackDeleteEventJobMock(payload);
    eventService.delete.mockResolvedValue(undefined);

    // Act
    const result = await handler.handle(job);

    // Assert
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(eventService.delete).toHaveBeenCalledWith(
      payload.payload.id,
      payload.userId,
      payload.userRole,
    );
    expect(result).toEqual({ originalPayload: payload });
  });

  it('should refuse a legacy job without userRole, without deleting and without retrying', async () => {
    // Arrange
    const { userId, payload } = FallbackDeleteEventFactory.buildPayload();
    const legacyPayload = { userId, payload };
    const job = createFallbackDeleteEventJobMock(legacyPayload);

    // Act + Assert
    await expect(handler.handle(job)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(eventService.delete).not.toHaveBeenCalled();
  });
});
