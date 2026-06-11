import {
  IsDefined,
  ValidateNested,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BaseConfig,
  PostgresConfig,
  RedisConfig,
  GatewayAuthConfig,
} from '@volontariapp/config';

export class ExtendedAuthConfig extends GatewayAuthConfig {
  @IsOptional()
  @IsString()
  accessTokenPrivateKeyPath?: string;

  @IsOptional()
  @IsString()
  refreshTokenPrivateKeyPath?: string;

  @IsOptional()
  @IsString()
  accessTokenExpiresIn?: string | number;

  @IsOptional()
  @IsString()
  refreshTokenExpiresIn?: string | number;
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
  @Type(() => ExtendedAuthConfig)
  auth!: ExtendedAuthConfig;
}
