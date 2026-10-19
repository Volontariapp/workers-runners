import { EventType as GrpcEventType } from '@volontariapp/contracts-nest';
import type { EventType } from '@volontariapp/domain-ranking';

export const toDomainEventType = (type: GrpcEventType): EventType =>
  type === GrpcEventType.EVENT_TYPE_ECOLOGY ? 'ECOLOGY' : 'SOCIAL';
