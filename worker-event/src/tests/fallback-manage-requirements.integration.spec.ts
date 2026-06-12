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
import { FallbackManageRequirementsHandler } from '../workers/handlers/fallback/fallback-manage-requirements.handler.js';
import { EventService, RequirementService } from '@volontariapp/domain-event';
import { JobMessagingType, EventsQueue } from '@volontariapp/messaging';
import { FallbackManageRequirementsFactory } from './factories/fallback-manage-requirements.factory.js';
import { EventFactory } from './factories/event.factory.js';
import { randomUUID } from 'crypto';
import { JobAuditRepository } from '@volontariapp/workers';
import { JobAuditStatus } from '@volontariapp/database';

jest.setTimeout(30000);

describe('FallbackManageRequirementsHandler (Integration)', () => {
  let testEnv: TestEnvironment;
  let databaseCleaner: DatabaseCleaner;
  let queue: Queue;
  let eventService: EventService;
  let auditRepo: JobAuditRepository;
  let handlerSpy: jest.SpiedFunction<
    FallbackManageRequirementsHandler['handle']
  >;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.init();

    databaseCleaner = new DatabaseCleaner(testEnv.getPostgresProvider());
    eventService = testEnv.get(EventService);
    auditRepo = testEnv.get(JobAuditRepository);

    const redisClient = testEnv.getRedisProvider().getDriver();
    queue = new Queue(EventsQueue.FALLBACK_EVENTS, { connection: redisClient });

    const handler = testEnv.get(FallbackManageRequirementsHandler);
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

  it('should process a FALLBACK_MANAGE_REQUIREMENTS (add) job exactly once', async () => {
    const event = await eventService.create(EventFactory.buildEventData());

    const payload = FallbackManageRequirementsFactory.buildPayload(event.id);

    const jobData = {
      emitter: 'test',
      emitterId: randomUUID(),
      payload,
    };

    await queue.add(JobMessagingType.FALLBACK_MANAGE_REQUIREMENTS, jobData, {
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
    expect(updatedEvent.requirements).toBeDefined();
    expect(updatedEvent.requirements?.length).toBeGreaterThan(0);
    expect(updatedEvent.requirements?.[0]?.name).toBe(
      payload.payload.add?.name,
    );
  });

  it('should retry job on failure and succeed on the second attempt, updating audit to COMPLETED', async () => {
    const event = await eventService.create(EventFactory.buildEventData());

    const payload = FallbackManageRequirementsFactory.buildPayload(event.id);

    const jobId = randomUUID();
    const jobData = {
      emitter: 'test',
      emitterId: randomUUID(),
      payload,
    };

    const createSpy = jest.spyOn(RequirementService.prototype, 'create');
    createSpy.mockRejectedValueOnce(new Error('Database error temporarily'));

    await queue.add(JobMessagingType.FALLBACK_MANAGE_REQUIREMENTS, jobData, {
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
    expect(updatedEvent.requirements?.length).toBeGreaterThan(0);

    createSpy.mockRestore();
  });

  it('should fail permanently when retries are exhausted and update audit to FAILED', async () => {
    const payload = FallbackManageRequirementsFactory.buildPayload();
    const jobId = randomUUID();
    const jobData = {
      emitter: 'test',
      emitterId: randomUUID(),
      payload,
    };

    const createSpy = jest.spyOn(EventService.prototype, 'findById');
    createSpy.mockRejectedValue(new Error('Database error permanently'));

    await queue.add(JobMessagingType.FALLBACK_MANAGE_REQUIREMENTS, jobData, {
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

    createSpy.mockRestore();
  });
});
