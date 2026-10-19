import {
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class S3Config {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  publicEndpoint!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  region!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  accessKey!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  secretKey!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  publicBucket!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  privateBucket!: string;

  @IsOptional()
  @IsString()
  publicBaseUrl?: string;

  @IsOptional()
  @IsNumber()
  presignedUrlTtl?: number;
}

export class ScannerConfig {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  host!: string;

  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeoutMs!: number;
}
