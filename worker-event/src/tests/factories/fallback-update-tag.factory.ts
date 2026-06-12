import { randomUUID } from 'crypto';
import type { IFallbackUpdateTagJobPayload } from '@volontariapp/messaging';
import { TagFactory } from './tag.factory.js';
import type { UpdateTagCommand } from '@volontariapp/contracts';

export class FallbackUpdateTagFactory {
  static buildPayload(
    tagId: string = randomUUID(),
  ): IFallbackUpdateTagJobPayload {
    const tagData = TagFactory.buildTagData();
    return {
      userId: randomUUID(),
      payload: {
        id: tagId,
        name: tagData.name,
        balise: tagData.balise,
      } as UpdateTagCommand,
    };
  }
}
