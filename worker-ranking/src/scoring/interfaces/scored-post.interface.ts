import type {
  PostOrigin,
  PostRankingReason,
} from '@volontariapp/domain-ranking';

export interface ScoredPost {
  id: string;
  authorId: string;
  origin: PostOrigin;
  score: number;
  reasons: PostRankingReason[];
}
