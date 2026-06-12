import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module.js';
import { PostgresProvider, RedisProvider } from '@volontariapp/bridge';
import type { INestApplication, Type } from '@nestjs/common';

export class TestEnvironment {
  private app!: INestApplication;
  private moduleFixture!: TestingModule;
  private postgresProvider!: PostgresProvider;
  private redisProvider!: RedisProvider;

  async init(): Promise<void> {
    try {
      this.moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
    } catch (err) {
      console.error('NESTJS COMPILE ERROR:', err);
      throw err;
    }

    this.app = this.moduleFixture.createNestApplication();

    this.postgresProvider =
      this.moduleFixture.get<PostgresProvider>(PostgresProvider);
    this.redisProvider = this.moduleFixture.get<RedisProvider>(RedisProvider);

    await this.app.init();
  }

  getApp(): INestApplication {
    return this.app;
  }

  get<TInput = unknown, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
  ): TResult {
    return this.moduleFixture.get<TInput, TResult>(typeOrToken);
  }

  getPostgresProvider(): PostgresProvider {
    return this.postgresProvider;
  }

  getRedisProvider(): RedisProvider {
    return this.redisProvider;
  }

  async teardown(): Promise<void> {
    await this.app.close();
  }
}
