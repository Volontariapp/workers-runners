import {
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseConfig, PostgresConfig, RedisConfig } from '@volontariapp/config';

export class MicroServicesConfig {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  msSocialUrl!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  msEventUrl!: string;
}

export class AuthConfigDetails {
  @IsOptional()
  @IsString()
  internalPrivateKeyPath: string = 'certs/internal.key';

  @IsOptional()
  @IsString()
  internalExpiresIn: string | number = '1h';
}

export class RankingConfig {
  /** Lignes conservees par utilisateur (RANKING_LIST_SIZE). */
  @IsDefined()
  @IsInt()
  @Min(1)
  listSize!: number;

  /** Candidats lus dans ms-event (RANKING_CANDIDATE_LIMIT). */
  @IsDefined()
  @IsInt()
  @Min(1)
  candidateLimit!: number;

  /** Evenements d'historique pour le resume de gout (RANKING_HISTORY_SIZE). */
  @IsDefined()
  @IsInt()
  @Min(0)
  historySize!: number;

  /** Identifiants d'exclusion lus au plus (RANKING_EXCLUDE_LIMIT). */
  @IsDefined()
  @IsInt()
  @Min(0)
  excludeLimit!: number;

  @IsDefined()
  @IsInt()
  @Min(1)
  passCooldownDays!: number;

  /** Fenetre des utilisateurs actifs d'un fan-out (RANKING_ACTIVE_DAYS). */
  @IsDefined()
  @IsInt()
  @Min(1)
  activeDays!: number;

  /** Plafond d'un fan-out EVENT_CREATED (RANKING_MAX_FANOUT). */
  @IsDefined()
  @IsInt()
  @Min(1)
  maxFanout!: number;

  @IsDefined()
  @IsInt()
  @Min(1)
  buzzWindowDays!: number;

  @IsDefined()
  @IsInt()
  @Min(1)
  requestTtlSeconds!: number;

  /** Delai des demandes de fond, laisse la coalescence agir (RANKING_DEBOUNCE_SECONDS). */
  @IsDefined()
  @IsInt()
  @Min(0)
  debounceSeconds!: number;

  /** Concurrence BullMQ (RANKING_WORKER_CONCURRENCY). */
  @IsDefined()
  @IsNumber()
  @Min(1)
  workerConcurrency!: number;

  /** Cle de 32 octets aleatoires pour dechiffrer la position (secret scelle RANKING_LOCATION_KEY). */
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  locationKey!: string;
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
  @Type(() => MicroServicesConfig)
  microServices!: MicroServicesConfig;

  @IsOptional()
  @ValidateNested()
  @Type(() => AuthConfigDetails)
  auth: AuthConfigDetails = new AuthConfigDetails();

  @IsDefined()
  @ValidateNested()
  @Type(() => RankingConfig)
  ranking!: RankingConfig;
}
