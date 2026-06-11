import { IsDefined, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseConfig, PostgresConfig, RedisConfig } from '@volontariapp/config';

export class WorkerAuthConfig {
  @IsDefined()
  @IsString()
  internalPrivateKeyPath!: string;

  @IsDefined()
  internalExpiresIn!: string | number;
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
}
