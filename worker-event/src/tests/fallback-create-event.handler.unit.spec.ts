/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { FallbackCreateEventHandler } from '../workers/handlers/fallback/fallback-create-event.handler.js';
import { FallbackCreateEventFactory } from './factories/fallback-create-event.factory.js';
import { createEventServiceMock } from './mocks/event-service.mock.js';
import { createFallbackCreateEventJobMock } from './mocks/fallback-create-event-job.mock.js';
import { EventEntity, TagEntity } from '@volontariapp/domain-event';

describe('FallbackCreateEventHandler (Unit)', () => {
  let eventService: ReturnType<typeof createEventServiceMock>;
  let handler: FallbackCreateEventHandler;

  beforeEach(() => {
    eventService = createEventServiceMock();
    handler = new FallbackCreateEventHandler(eventService);
  });

  it('should replay event creation with precomputed eventId and coverFileId', async () => {
    // Arrange
    const payload = FallbackCreateEventFactory.buildPayload({
      payload: {
        coverFileId: 'cover-file-uuid-1',
      },
    });
    const job = createFallbackCreateEventJobMock(payload);
    eventService.create.mockResolvedValue(new EventEntity());

    // Act
    const result = await handler.handle(job);

    // Assert
    expect(eventService.create).toHaveBeenCalledTimes(1);
    expect(eventService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: payload.eventId,
        coverFileId: 'cover-file-uuid-1',
        name: payload.payload.title,
        description: payload.payload.description,
        type: payload.payload.type,
        awardedImpactScore: payload.payload.awardedImpactScore,
        maxParticipants: payload.payload.maxParticipants,
        organizerId: payload.userId,
      }),
    );
    expect(result).toEqual({ originalPayload: payload });
  });

  it('should pass eventId without coverFileId when no cover is attached', async () => {
    // Arrange
    const payload = FallbackCreateEventFactory.buildPayload();
    delete payload.payload.coverFileId;
    const job = createFallbackCreateEventJobMock(payload);
    eventService.create.mockResolvedValue(new EventEntity());

    // Act
    const result = await handler.handle(job);

    // Assert
    expect(eventService.create).toHaveBeenCalledTimes(1);
    expect(eventService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: payload.eventId,
        name: payload.payload.title,
        description: payload.payload.description,
        organizerId: payload.userId,
      }),
    );
    const createCallArg = eventService.create.mock.calls[0][0];
    expect(createCallArg.coverFileId).toBeUndefined();
    expect(result).toEqual({ originalPayload: payload });
  });

  it('should correctly parse startAt and endAt with Timestamp seconds format', async () => {
    // Arrange
    const startSeconds = 1735689600; // 2025-01-01T00:00:00Z
    const endSeconds = 1735693200; // 2025-01-01T01:00:00Z
    const payload = FallbackCreateEventFactory.buildPayload({
      payload: {
        startAt: { seconds: startSeconds, nanos: 0 },
        endAt: { seconds: endSeconds, nanos: 0 },
      },
    });
    const job = createFallbackCreateEventJobMock(payload);
    eventService.create.mockResolvedValue(new EventEntity());

    // Act
    await handler.handle(job);

    // Assert
    expect(eventService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        startAt: new Date(startSeconds * 1000),
        endAt: new Date(endSeconds * 1000),
      }),
    );
  });

  it('should correctly parse startAt and endAt with string ISO format', async () => {
    // Arrange
    const startIso = '2025-06-01T10:00:00.000Z';
    const endIso = '2025-06-01T12:00:00.000Z';
    const payload = FallbackCreateEventFactory.buildPayload({
      payload: {
        startAt: startIso as unknown as { seconds: number; nanos: number },
        endAt: endIso as unknown as { seconds: number; nanos: number },
      },
    });
    const job = createFallbackCreateEventJobMock(payload);
    eventService.create.mockResolvedValue(new EventEntity());

    // Act
    await handler.handle(job);

    // Assert
    expect(eventService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        startAt: new Date(startIso),
        endAt: new Date(endIso),
      }),
    );
  });

  it('should map tagIds to TagEntity instances', async () => {
    // Arrange
    const tagId1 = 'tag-1';
    const tagId2 = 'tag-2';
    const payload = FallbackCreateEventFactory.buildPayload({
      payload: {
        tagIds: [tagId1, tagId2],
      },
    });
    const job = createFallbackCreateEventJobMock(payload);
    eventService.create.mockResolvedValue(new EventEntity());

    // Act
    await handler.handle(job);

    // Assert
    const createCallArg = eventService.create.mock.calls[0][0];
    expect(createCallArg.tags).toHaveLength(2);
    expect(createCallArg.tags?.[0]).toBeInstanceOf(TagEntity);
    expect(createCallArg.tags?.[0].id).toBe(tagId1);
    expect(createCallArg.tags?.[1]).toBeInstanceOf(TagEntity);
    expect(createCallArg.tags?.[1].id).toBe(tagId2);
  });
});
