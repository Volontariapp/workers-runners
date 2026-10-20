import type {
  AuthorSignal,
  EventTieState,
  PostOrigin,
} from '@volontariapp/domain-ranking';
import type { RankingPost } from '../../clients/interfaces/ranking-post.interface.js';

export interface FeedCandidate {
  post: RankingPost;
  origin: PostOrigin;
  eventTie: EventTieState;
  signals: readonly AuthorSignal[];
  followed: boolean;
  friend: boolean;
  alreadyEngaged: boolean;
}
