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
import { FallbackChangeEventStateHandler } from '../workers/handlers/fallback/fallback-change-event-state.handler.js';
import { EventService } from '@volontariapp/domain-event';
import { JobMessagingType, EventsQueue } from '@volontariapp/messaging';
import { FallbackChangeEventStateFactory } from './factories/fallback-change-event-state.factory.js';
import { EventFactory } from './factories/event.factory.js';
import { randomUUID } from 'crypto';
import { JobAuditRepository } from '@volontariapp/workers';
import { JobAuditStatus } from '@volontariapp/database';

jest.setTimeout(30000);

describe('FallbackChangeEventStateHandler (Integration)', () => {
  let testEnv: TestEnvironment;
  let databaseCleaner: DatabaseCleaner;
  let queue: Queue;
  let eventService: EventService;
  let auditRepo: JobAuditRepository;
  let handlerSpy: jest.SpiedFunction<FallbackChangeEventStateHandler['handle']>;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.init();

    databaseCleaner = new DatabaseCleaner(testEnv.getPostgresProvider());
    eventService = testEnv.get(EventService);
    auditRepo = testEnv.get(JobAuditRepository);

    const redisClient = testEnv.getRedisProvider().getDriver();
    queue = new Queue(EventsQueue.FALLBACK_EVENTS, { connection: redisClient });

    const handler = testEnv.get(FallbackChangeEventStateHandler);
    handlerSpy = jest.spyOn(handler, 'handle');
  });

  afterAll(async () => {
    await testEnv.teardown();
    await queue.close();
  });

  beforeEach(async () => {
    await databaseCleaner.clearAllTables();
    handlerSpy.mockClear();
    await queue.obliterate({ force: true });
  });

  it('should process a FALLBACK_CHANGE_EVENT_STATE job exactly once', async () => {
    const event = await eventService.create(EventFactory.buildEventData());

    const payload = FallbackChangeEventStateFactory.buildPayload();
    payload.payload.id = event.id;

    const jobData = {
      emitter: 'test',
      emitterId: randomUUID(),
      payload,
    };

    await queue.add(JobMessagingType.FALLBACK_CHANGE_EVENT_STATE, jobData, {
      jobId: randomUUID(),
    });

    let attempts = 0;
    while (handlerSpy.mock.calls.length === 0 && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(handlerSpy).toHaveBeenCalledTimes(1);

    const updatedEvent = await eventService.findById(event.id);
    expect(updatedEvent).toBeDefined();
    expect(updatedEvent.state).toBe(payload.payload.newState);
  });

  it('should retry job on failure and succeed on the second attempt, updating audit to COMPLETED', async () => {
    const event = await eventService.create(EventFactory.buildEventData());

    const payload = FallbackChangeEventStateFactory.buildPayload();
    payload.payload.id = event.id;

    const jobId = randomUUID();
    const jobData = {
      emitter: 'test',
      emitterId: randomUUID(),
      payload,
    };

    const changeStateSpy = jest.spyOn(EventService.prototype, 'changeState');
    changeStateSpy.mockRejectedValueOnce(
      new Error('Database error temporarily'),
    );

    await queue.add(JobMessagingType.FALLBACK_CHANGE_EVENT_STATE, jobData, {
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

    const updatedEvent = await eventService.findById(event.id);
    expect(updatedEvent.state).toBe(payload.payload.newState);

    changeStateSpy.mockRestore();
  });

  it('should fail permanently when retries are exhausted and update audit to FAILED', async () => {
    const payload = FallbackChangeEventStateFactory.buildPayload();
    const jobId = randomUUID();
    const jobData = {
      emitter: 'test',
      emitterId: randomUUID(),
      payload,
    };

    const changeStateSpy = jest.spyOn(EventService.prototype, 'changeState');
    changeStateSpy.mockRejectedValue(new Error('Database error permanently'));

    await queue.add(JobMessagingType.FALLBACK_CHANGE_EVENT_STATE, jobData, {
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

    changeStateSpy.mockRestore();
  });
});
