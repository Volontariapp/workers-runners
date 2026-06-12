import type { TagEntity } from '@volontariapp/domain-event';

export class TagFactory {
  static buildTagData(overrides: Partial<TagEntity> = {}): Partial<TagEntity> {
    return {
      name: 'Test Tag',
      slug: 'test-tag',
      balise: 'test-balise',
      ...overrides,
    };
  }
}
