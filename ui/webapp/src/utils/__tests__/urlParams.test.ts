import { describe, expect, it } from 'vitest';

import { buildPath, parseEnum, parseItemId, withParams } from '../urlParams';

const MODES = ['card', 'grid'] as const;

describe('withParams', () => {
  it('keeps untouched repeated keys and the hash when a key is set', () => {
    // Set the item on a URL with a repeated filter and a hash
    const search = withParams('?view-mode=card&project=a&project=b', { item: 'x' });

    // Verify the repeated values survive and the hash is kept by the path
    expect(search).toBe('?view-mode=card&project=a&project=b&item=x');
    expect(buildPath('/', search, '#h')).toBe('/?view-mode=card&project=a&project=b&item=x#h');
  });

  it('deletes a key whose update is undefined', () => {
    expect(withParams('?project=a&item=x&project=b', { item: undefined })).toBe('?project=a&project=b');
  });

  it('appends every value of an array, replacing the previous ones', () => {
    expect(withParams('?tag=old&group=g', { tag: ['a', 'b'] })).toBe('?group=g&tag=a&tag=b');
  });

  it('replaces a repeated key set to a string in place', () => {
    expect(withParams('?group=a&project=p&group=b', { group: 'c' })).toBe('?group=c&project=p');
  });

  it('returns an empty search when no params are left', () => {
    expect(withParams('?item=x', { item: undefined })).toBe('');
  });

  it('accepts a search without the leading question mark', () => {
    expect(withParams('group=a', { item: 'x' })).toBe('?group=a&item=x');
  });
});

describe('buildPath', () => {
  it('joins the pathname, search and hash', () => {
    expect(buildPath('/landscape/', '?group=a', '#h')).toBe('/landscape/?group=a#h');
  });

  it('omits an empty search', () => {
    expect(buildPath('/stats', '', '')).toBe('/stats');
    expect(buildPath('/stats', '?', '#h')).toBe('/stats#h');
  });

  it('adds the question mark to a search without it', () => {
    expect(buildPath('/', 'group=a', '')).toBe('/?group=a');
  });
});

describe('parseItemId', () => {
  it('returns a single value', () => {
    expect(parseItemId('item-1')).toBe('item-1');
  });

  it('gives no item for a repeated key, an empty value or a missing one', () => {
    expect(parseItemId(['a', 'b'])).toBeUndefined();
    expect(parseItemId('')).toBeUndefined();
    expect(parseItemId(undefined)).toBeUndefined();
  });
});

describe('parseEnum', () => {
  it('returns an allowed value', () => {
    expect(parseEnum('card', MODES, 'grid')).toBe('card');
  });

  it('gives the fallback for an unknown value, a repeated key or a missing one', () => {
    expect(parseEnum('list', MODES, 'grid')).toBe('grid');
    expect(parseEnum(['card', 'grid'], MODES, 'grid')).toBe('grid');
    expect(parseEnum(undefined, MODES, 'card')).toBe('card');
  });
});
