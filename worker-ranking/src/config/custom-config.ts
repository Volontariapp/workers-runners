import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BaseConfig, PostgresConfig, RedisConfig } from '@volontariapp/config';
import { booleanFlag } from './helpers/boolean-flag.helpers.js';

export class MicroServicesConfig {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  msSocialUrl!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  msEventUrl!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  msPostUrl!: string;
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

  /** Lignes conservees par utilisateur pour le feed (RANKING_FEED_LIST_SIZE). */
  @IsDefined()
  @IsInt()
  @Min(1)
  feedListSize!: number;

  /** Auteurs candidats au plus : signaux puis abonnements (RANKING_FEED_AUTHORS). */
  @IsDefined()
  @IsInt()
  @Min(1)
  feedAuthors!: number;

  /** Age maximal d'un post hors lien evenement (RANKING_FEED_MAX_AGE_DAYS). */
  @IsDefined()
  @IsInt()
  @Min(1)
  feedMaxAgeDays!: number;

  /** Age maximal d'un post lie a un evenement de l'utilisateur (RANKING_FEED_EVENT_POST_MAX_AGE_DAYS). */
  @IsDefined()
  @IsInt()
  @Min(1)
  feedEventPostMaxAgeDays!: number;

  /** Plafond d'un fan-out POST_CREATED (RANKING_FEED_MAX_FANOUT). */
  @IsDefined()
  @IsInt()
  @Min(1)
  feedMaxFanout!: number;

  /** Minimum de posts personnels avant le complement GLOBAL (RANKING_FEED_MIN_ITEMS). */
  @IsDefined()
  @IsInt()
  @Min(0)
  feedMinItems!: number;

  /** Likes du graphe reconcilies par calcul (RANKING_FEED_LIKES_LIMIT). */
  @IsDefined()
  @IsInt()
  @Min(1)
  feedLikesLimit!: number;

  /** Complement GLOBAL apres les posts personnels, active par defaut (RANKING_FEED_GLOBAL_ENABLED). */
  @IsDefined()
  @Transform(booleanFlag('feedGlobalEnabled'))
  @IsBoolean()
  feedGlobalEnabled!: boolean;

  /** Activation explicite du scoreur semantique Jev (RANKING_JEV_ENABLED). */
  @IsDefined()
  @Transform(booleanFlag('jevEnabled'))
  @IsBoolean()
  jevEnabled!: boolean;

  /** Cle API TypeSafe AI Jev (TYPESAFE_API_KEY). Optionnelle : repli structurel si absente. */
  @IsOptional()
  @IsString()
  jevApiKey?: string;

  /** URL du point d'entree Jev (JEV_URL / JEV_BASE_URL). */
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  jevBaseUrl!: string;

  /** Timeout d'un appel Jev en ms (JEV_TIMEOUT_MS). */
  @IsDefined()
  @IsInt()
  @Min(100)
  jevTimeoutMs!: number;

  /** Nom du modele Jev utilise (JEV_MODEL). */
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  jevModel!: string;

  /** Plafond de candidats envoyes a Jev (RANKING_JEV_CANDIDATES). */
  @IsDefined()
  @IsInt()
  @Min(1)
  jevCandidatesLimit!: number;

  /** Nombre d'echecs consecutifs avant ouverture du coupe-circuit (JEV_CIRCUIT_BREAKER_THRESHOLD). */
  @IsDefined()
  @IsInt()
  @Min(1)
  jevCircuitBreakerThreshold!: number;

  /** Duree de repos du coupe-circuit en ms avant demi-ouverture (JEV_CIRCUIT_BREAKER_COOLDOWN_MS). */
  @IsDefined()
  @IsInt()
  @Min(1000)
  jevCircuitBreakerCooldownMs!: number;
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
