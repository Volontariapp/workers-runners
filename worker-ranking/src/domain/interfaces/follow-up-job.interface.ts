import type { RankingListKind } from '@volontariapp/domain-ranking';
import type { RankingComputeReason } from '@volontariapp/messaging';

export interface FollowUpJob {
  userId: string;
  listKind: RankingListKind;
  reason: RankingComputeReason;
  /** Date de la demande qui a survecu au calcul, telle que retournee par la base. */
  requestedAt: string;
}
