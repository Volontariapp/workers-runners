import { randomUUID } from 'crypto';
import { UserRoles } from '@volontariapp/shared';
import type { IFallbackDeleteEventJobPayload } from '@volontariapp/messaging';

export class FallbackDeleteEventFactory {
  static buildPayload(
    overrides: Partial<IFallbackDeleteEventJobPayload> = {},
  ): IFallbackDeleteEventJobPayload {
    return {
      userId: randomUUID(),
      userRole: UserRoles.ORGANIZATION,
      payload: {
        id: randomUUID(),
      },
      ...overrides,
    };
  }
}
