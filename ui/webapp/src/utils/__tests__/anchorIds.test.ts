import { beforeEach, describe, expect, it } from 'vitest';

import { createBaseData } from '../../test-utils/fixtures';
import type { Guide } from '../../types';
import { getAnchorId, UNDEFINED_MATURITY_ANCHOR_ID, UNDEFINED_TAG_ANCHOR_ID } from '../anchorIds';

// Base data with the normalized names shipped by Rust
const baseData = createBaseData({
  categories: [
    {
      name: 'App Definition & Development',
      normalized_name: 'app-definition-development',
      subcategories: [{ name: 'Database & Storage', normalized_name: 'database-storage' }],
    },
  ],
  maturity_options: [{ name: 'Early Stage', normalized_name: 'early-stage' }],
  tag_options: [{ name: 'a--b', normalized_name: 'a-b' }],
});

// Guide with an entry shared with the landscape and guide-only entries
const guide: Guide = {
  categories: [
    {
      category: 'App Definition & Development',
      normalized_name: 'app-definition-development',
      subcategories: [
        { content: '', normalized_name: 'guide-only-subcategory', subcategory: 'Guide Only: Subcategory' },
      ],
    },
    {
      category: 'Introduction & Overview',
      normalized_name: 'introduction-overview',
      subcategories: [{ content: '', normalized_name: 'what-it-is', subcategory: 'What It Is?' }],
    },
  ],
};

describe('getAnchorId', () => {
  beforeEach(() => {
    window.baseDS = baseData;
  });

  it('resolves categories and subcategories to the shipped normalized names', () => {
    expect(getAnchorId({ title: 'App Definition & Development' })).toBe('app-definition-development');
    expect(getAnchorId({ title: 'App Definition & Development', subtitle: 'Database & Storage' })).toBe(
      'database-storage'
    );
    expect(getAnchorId({ title: 'App Definition & Development', subtitle: 'Database & Storage', grouped: true })).toBe(
      'app-definition-development--database-storage'
    );
  });

  it('resolves maturity and TAG options to the shipped normalized names', () => {
    expect(getAnchorId({ title: 'Maturity', subtitle: 'Early Stage', grouped: true })).toBe('maturity--early-stage');
    expect(getAnchorId({ title: 'maturity', subtitle: 'Early Stage', grouped: true })).toBe('maturity--early-stage');
    expect(getAnchorId({ title: 'Tag', subtitle: 'a--b', grouped: true })).toBe('tag--a-b');
    expect(getAnchorId({ title: 'tag', subtitle: 'a--b', grouped: true })).toBe('tag--a-b');
  });

  it('resolves the bucket of the items without maturity or TAG to its constant id', () => {
    expect(getAnchorId({ title: 'Maturity', subtitle: 'undefined', grouped: true })).toBe(UNDEFINED_MATURITY_ANCHOR_ID);
    expect(getAnchorId({ title: 'Tag', subtitle: 'undefined', grouped: true })).toBe(UNDEFINED_TAG_ANCHOR_ID);
    expect(UNDEFINED_MATURITY_ANCHOR_ID).toBe('maturity--undefined');
    expect(UNDEFINED_TAG_ANCHOR_ID).toBe('tag--undefined');
  });

  it('resolves guide-only entries from the guide normalized names', () => {
    expect(getAnchorId({ title: 'Introduction & Overview' }, guide)).toBe('introduction-overview');
    expect(getAnchorId({ title: 'Introduction & Overview', subtitle: 'What It Is?', grouped: true }, guide)).toBe(
      'introduction-overview--what-it-is'
    );
    expect(
      getAnchorId({ title: 'App Definition & Development', subtitle: 'Guide Only: Subcategory', grouped: true }, guide)
    ).toBe('app-definition-development--guide-only-subcategory');
  });

  it('returns undefined for unknown entries', () => {
    expect(getAnchorId({ title: 'Unknown Category' })).toBeUndefined();
    expect(getAnchorId({ title: 'App Definition & Development', subtitle: 'Unknown', grouped: true })).toBeUndefined();
    expect(getAnchorId({ title: 'Maturity', subtitle: 'Unknown', grouped: true })).toBeUndefined();
    expect(getAnchorId({ title: 'Tag', subtitle: 'Unknown' })).toBeUndefined();
    expect(getAnchorId({ title: 'Maturity' })).toBeUndefined();
    expect(getAnchorId({ title: 'Introduction & Overview' })).toBeUndefined();
  });
});
