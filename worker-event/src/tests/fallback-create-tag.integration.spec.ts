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
import { FallbackCreateTagHandler } from '../workers/handlers/fallback/fallback-create-tag.handler.js';
import { TagService } from '@volontariapp/domain-event';
import { JobMessagingType, EventsQueue } from '@volontariapp/messaging';
import { FallbackCreateTagFactory } from './factories/fallback-create-tag.factory.js';
import { randomUUID } from 'crypto';
import { JobAuditRepository } from '@volontariapp/workers';
import { JobAuditStatus } from '@volontariapp/database';

jest.setTimeout(30000);

describe('FallbackCreateTagHandler (Integration)', () => {
  let testEnv: TestEnvironment;
  let databaseCleaner: DatabaseCleaner;
  let queue: Queue;
  let tagService: TagService;
  let auditRepo: JobAuditRepository;
  let handlerSpy: jest.SpiedFunction<FallbackCreateTagHandler['handle']>;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.init();

    databaseCleaner = new DatabaseCleaner(testEnv.getPostgresProvider());
    tagService = testEnv.get(TagService);
    auditRepo = testEnv.get(JobAuditRepository);

    const redisClient = testEnv.getRedisProvider().getDriver();
    queue = new Queue(EventsQueue.FALLBACK_EVENTS, { connection: redisClient });

    const handler = testEnv.get(FallbackCreateTagHandler);
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

  it('should process a FALLBACK_CREATE_TAG job exactly once', async () => {
    const payload = FallbackCreateTagFactory.buildPayload();

    const jobData = {
      emitter: 'test',
      emitterId: randomUUID(),
      payload,
    };

    await queue.add(JobMessagingType.FALLBACK_CREATE_TAG, jobData, {
      jobId: randomUUID(),
    });

    let attempts = 0;
    while (handlerSpy.mock.calls.length === 0 && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(handlerSpy).toHaveBeenCalledTimes(1);

    const allTags = await tagService.findAll();
    expect(allTags.length).toBe(1);
    expect(allTags[0]?.name).toBe(payload.payload.name);
  });

  it('should retry job on failure and succeed on the second attempt, updating audit to COMPLETED', async () => {
    const payload = FallbackCreateTagFactory.buildPayload();
    const jobId = randomUUID();
    const jobData = {
      emitter: 'test',
      emitterId: randomUUID(),
      payload,
    };

    const createSpy = jest.spyOn(TagService.prototype, 'create');
    createSpy.mockRejectedValueOnce(new Error('Database error temporarily'));

    await queue.add(JobMessagingType.FALLBACK_CREATE_TAG, jobData, {
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

    const allTags = await tagService.findAll();
    expect(allTags.length).toBe(1);

    createSpy.mockRestore();
  });

  it('should fail permanently when retries are exhausted and update audit to FAILED', async () => {
    const payload = FallbackCreateTagFactory.buildPayload();
    const jobId = randomUUID();
    const jobData = {
      emitter: 'test',
      emitterId: randomUUID(),
      payload,
    };

    const createSpy = jest.spyOn(TagService.prototype, 'create');
    createSpy.mockRejectedValue(new Error('Database error permanently'));

    await queue.add(JobMessagingType.FALLBACK_CREATE_TAG, jobData, {
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

    const allTags = await tagService.findAll();
    expect(allTags.length).toBe(0);

    createSpy.mockRestore();
  });
});
