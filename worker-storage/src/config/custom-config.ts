import { IsDefined, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseConfig, PostgresConfig, RedisConfig } from '@volontariapp/config';
import { S3Config, ScannerConfig } from './storage-config.js';

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
  @Type(() => S3Config)
  s3!: S3Config;

  @IsDefined()
  @ValidateNested()
  @Type(() => ScannerConfig)
  scanner!: ScannerConfig;
}
