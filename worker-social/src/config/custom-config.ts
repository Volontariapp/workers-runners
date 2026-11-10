import {
  IsDefined,
  ValidateNested,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BaseConfig,
  PostgresConfig,
  RedisConfig,
  Neo4jConfig,
} from '@volontariapp/config';

export class WorkerAuthConfig {
  @IsDefined()
  @IsString()
  internalPrivateKeyPath!: string;

  @IsDefined()
  internalExpiresIn!: string | number;
}

export class SocialWorkerConfig {
  /** Jobs traites en parallele sur la file social (SOCIAL_WORKER_CONCURRENCY). */
  @IsDefined()
  @IsNumber()
  @Min(1)
  workerConcurrency!: number;

  /** Jobs traites au plus par fenetre du limiteur BullMQ (SOCIAL_WORKER_LIMITER_MAX). */
  @IsDefined()
  @IsNumber()
  @Min(1)
  limiterMax!: number;

  /** Duree de la fenetre du limiteur, en ms (SOCIAL_WORKER_LIMITER_DURATION_MS). */
  @IsDefined()
  @IsNumber()
  @Min(1)
  limiterDurationMs!: number;
}

export class CustomConfig extends BaseConfig {
  @IsDefined()
  @ValidateNested()
  @Type(() => PostgresConfig)
  db!: PostgresConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => RedisConfig)
  redis!: RedisConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => WorkerAuthConfig)
  auth!: WorkerAuthConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => Neo4jConfig)
  neo4j!: Neo4jConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => SocialWorkerConfig)
  social!: SocialWorkerConfig;
}
