import { describe, expect, it } from 'vitest';

import { buildShowItemDetailsMessage, parseShowItemDetailsMessage, type ShowItemDetailsInput } from '../messages';
import { ClassifyType } from '../params';

const INPUT: ShowItemDetailsInput = {
  categories: ['app-definition', 'runtime'],
  classifyBy: ClassifyType.Category,
  foundation: 'CNCF',
  hideOrganizationSection: true,
  itemId: 'app-definition--database--item',
  key: 'app-definition__runtime',
};

describe('buildShowItemDetailsMessage', () => {
  it('builds a typed message without a base path', () => {
    const message = buildShowItemDetailsMessage(INPUT);

    expect(message).toEqual({ ...INPUT, type: 'showItemDetails' });
    expect(message).not.toHaveProperty('basePath');
  });

  it('leaves out the optional fields that are not set', () => {
    const message = buildShowItemDetailsMessage({
      ...INPUT,
      categories: undefined,
      hideOrganizationSection: undefined,
    });

    expect(Object.keys(message).sort()).toEqual(['classifyBy', 'foundation', 'itemId', 'key', 'type']);
  });
});

describe('parseShowItemDetailsMessage', () => {
  it('round-trips a built message', () => {
    const message = buildShowItemDetailsMessage(INPUT);

    expect(parseShowItemDetailsMessage(message)).toEqual(message);
  });

  it('round-trips a built message without the optional fields', () => {
    const message = buildShowItemDetailsMessage({
      ...INPUT,
      categories: undefined,
      hideOrganizationSection: undefined,
    });

    expect(parseShowItemDetailsMessage(message)).toEqual(message);
  });

  it.each([ClassifyType.Category, ClassifyType.Maturity, ClassifyType.TAG])(
    'accepts the %s classification',
    (classifyBy) => {
      const message = buildShowItemDetailsMessage({ ...INPUT, classifyBy });

      expect(parseShowItemDetailsMessage(message)?.classifyBy).toBe(classifyBy);
    }
  );

  it.each(['observability', 'graduated', 'a+b', 'zhōng-文', 'all', 'category--subcategory'])(
    'accepts the key %j',
    (key) => {
      expect(parseShowItemDetailsMessage(buildShowItemDetailsMessage({ ...INPUT, key }))?.key).toBe(key);
    }
  );

  it('drops unknown fields such as a base path', () => {
    const message = { ...buildShowItemDetailsMessage(INPUT), basePath: '//evil.example' };

    expect(parseShowItemDetailsMessage(message)).not.toHaveProperty('basePath');
  });

  it.each<[string, unknown]>([
    ['null', null],
    ['a string', 'showItemDetails'],
    ['a wrong type', { ...buildShowItemDetailsMessage(INPUT), type: 'hideItemDetails' }],
    ['a non-string itemId', { ...buildShowItemDetailsMessage(INPUT), itemId: 42 }],
    ['an empty itemId', { ...buildShowItemDetailsMessage(INPUT), itemId: '' }],
    ['a bad classifyBy', { ...buildShowItemDetailsMessage(INPUT), classifyBy: 'organization' }],
    ['a key with /', { ...buildShowItemDetailsMessage(INPUT), key: '../full' }],
    ['a missing key', { ...buildShowItemDetailsMessage(INPUT), key: undefined }],
    ['a non-string foundation', { ...buildShowItemDetailsMessage(INPUT), foundation: null }],
    ['non-array categories', { ...buildShowItemDetailsMessage(INPUT), categories: 'runtime' }],
    ['categories with a bad key', { ...buildShowItemDetailsMessage(INPUT), categories: ['runtime', 'a/b'] }],
    [
      'a non-boolean hideOrganizationSection',
      { ...buildShowItemDetailsMessage(INPUT), hideOrganizationSection: 'true' },
    ],
  ])('rejects %s', (_, data) => {
    expect(parseShowItemDetailsMessage(data)).toBeNull();
  });
});
