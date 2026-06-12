import { randomUUID } from 'crypto';
import type { IFallbackCreateTagJobPayload } from '@volontariapp/messaging';

import { TagFactory } from './tag.factory.js';

export class FallbackCreateTagFactory {
  static buildPayload(): IFallbackCreateTagJobPayload {
    const tagData = TagFactory.buildTagData();
    return {
      userId: randomUUID(),
      payload: {
        name: tagData.name!,
        slug: tagData.slug!,
        balise: tagData.balise!,
      },
    };
  }
}
