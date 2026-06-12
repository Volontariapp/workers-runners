import {
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  it,
  jest,
  expect,
} from '@jest/globals';
import { Queue } from 'bullmq';
import { TestEnvironment } from './setup/test-environment.js';
import { DatabaseCleaner } from './setup/database-cleaner.js';
import { FallbackCreateEventHandler } from '../workers/handlers/fallback/fallback-create-event.handler.js';
import { EventService } from '@volontariapp/domain-event';
import { JobMessagingType, EventsQueue } from '@volontariapp/messaging';
import { FallbackCreateEventFactory } from './factories/fallback-create-event.factory.js';
import { randomUUID } from 'crypto';
import { JobAuditRepository } from '@volontariapp/workers';
import { JobAuditStatus } from '@volontariapp/database';

jest.setTimeout(30000);

describe('FallbackEventWorker (Integration)', () => {
  let testEnv: TestEnvironment;
  let databaseCleaner: DatabaseCleaner;
  let queue: Queue;
  let eventService: EventService;
  let auditRepo: JobAuditRepository;
  let handlerSpy: jest.SpiedFunction<FallbackCreateEventHandler['handle']>;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.init();

    databaseCleaner = new DatabaseCleaner(testEnv.getPostgresProvider());
    eventService = testEnv.get(EventService);
    auditRepo = testEnv.get(JobAuditRepository);

    const redisClient = testEnv.getRedisProvider().getDriver();
    queue = new Queue(EventsQueue.FALLBACK_EVENTS, { connection: redisClient });

    const handler = testEnv.get(FallbackCreateEventHandler);
    handlerSpy = jest.spyOn(handler, 'handle');
  });

  afterAll(async () => {
    await queue.close();
    await testEnv.teardown();
  });

  beforeEach(async () => {
    await databaseCleaner.clearAllTables();
    handlerSpy.mockClear();
    await queue.obliterate({ force: true });
  });

  it('should process a FALLBACK_CREATE_EVENT job exactly once and save the event in db', async () => {
    const payload = FallbackCreateEventFactory.buildPayload();

    const jobData = {
      emitter: 'test',
      emitterId: randomUUID(),
      payload,
    };

    await queue.add(JobMessagingType.FALLBACK_CREATE_EVENT, jobData, {
      jobId: randomUUID(),
    });

    let attempts = 0;
    while (handlerSpy.mock.calls.length === 0 && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(handlerSpy).toHaveBeenCalledTimes(1);

    const dbEvents = await eventService.findAll();
    expect(dbEvents.length).toBe(1);
    const dbEvent = dbEvents[0];

    expect(dbEvent).toBeDefined();
    expect(dbEvent.name).toBe(payload.payload.title);
    expect(dbEvent.description).toBe(payload.payload.description);
    expect(dbEvent.type).toBe(payload.payload.type);
    expect(dbEvent.organizerId).toBe(payload.userId);
  });

  it('should retry job on failure and succeed on the second attempt, updating audit to COMPLETED', async () => {
    const payload = FallbackCreateEventFactory.buildPayload();
    const jobId = randomUUID();
    const jobData = {
      emitter: 'test',
      emitterId: randomUUID(),
      payload,
    };

    const createSpy = jest.spyOn(eventService, 'create');
    createSpy.mockRejectedValueOnce(
      new Error('Database insertion failed temporarily'),
    );

    await queue.add(JobMessagingType.FALLBACK_CREATE_EVENT, jobData, {
      jobId,
      attempts: 2,
      backoff: { type: 'fixed', delay: 100 },
    });

    let attempts = 0;
    while (handlerSpy.mock.calls.length < 2 && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(handlerSpy).toHaveBeenCalledTimes(2);

    const audit = await auditRepo.findByJobId(jobId);
    expect(audit).toBeDefined();
    expect(audit?.status).toBe(JobAuditStatus.COMPLETED);
    expect(audit?.currentAttempt).toBe(2);

    const dbEvents = await eventService.findAll();
    expect(dbEvents.length).toBe(1);

    createSpy.mockRestore();
  });

  it('should fail permanently when retries are exhausted and update audit to FAILED', async () => {
    const payload = FallbackCreateEventFactory.buildPayload();
    const jobId = randomUUID();
    const jobData = {
      emitter: 'test',
      emitterId: randomUUID(),
      payload,
    };

    const createSpy = jest.spyOn(eventService, 'create');
    createSpy.mockRejectedValue(
      new Error('Database insertion failed permanently'),
    );

    await queue.add(JobMessagingType.FALLBACK_CREATE_EVENT, jobData, {
      jobId,
      attempts: 3,
      backoff: { type: 'fixed', delay: 100 },
    });

    let attempts = 0;
    while (handlerSpy.mock.calls.length < 3 && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(handlerSpy).toHaveBeenCalledTimes(3);

    const audit = await auditRepo.findByJobId(jobId);
    expect(audit).toBeDefined();
    expect(audit?.status).toBe(JobAuditStatus.FAILED);
    expect(audit?.currentAttempt).toBe(3);
    expect(audit?.errorMessage).toContain(
      'Database insertion failed permanently',
    );

    const dbEvents = await eventService.findAll();
    expect(dbEvents.length).toBe(0);

    createSpy.mockRestore();
  });
});
