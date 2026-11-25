import { beforeEach, describe, expect, it } from 'vitest';

import { createBaseData } from '../../test-utils/fixtures';
import type { Guide } from '../../types';
import { getAnchorId, normalizeName, UNDEFINED_MATURITY_ANCHOR_ID, UNDEFINED_TAG_ANCHOR_ID } from '../anchorIds';

// Base data with the normalized names shipped by Rust
const baseData = createBaseData({
  categories: [
    {
      name: 'App Definition & Development',
      normalized_name: 'app-definition-development',
      subcategories: [{ name: 'Database & Storage', normalized_name: 'database-storage' }],
    },
    {
      name: 'Industry',
      normalized_name: 'industry',
      subcategories: [],
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
      subcategories: [{ content: '', normalized_name: 'custom-guide-slug', subcategory: 'Guide Only: Subcategory' }],
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

  it('falls back to normalizing undeclared subcategories of declared categories', () => {
    expect(getAnchorId({ title: 'App Definition & Development', subtitle: 'AI SIG', grouped: true })).toBe(
      'app-definition-development--ai-sig'
    );
    expect(getAnchorId({ title: 'App Definition & Development', subtitle: 'AI SIG' })).toBe('ai-sig');
    expect(getAnchorId({ title: 'Industry', subtitle: 'Financial Services & Banking', grouped: true })).toBe(
      'industry--financial-services-banking'
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
    ).toBe('app-definition-development--custom-guide-slug');
  });

  it('returns undefined when a fallback subcategory collides with a declared subcategory', () => {
    expect(
      getAnchorId({ title: 'App Definition & Development', subtitle: 'database storage', grouped: true })
    ).toBeUndefined();
    expect(
      getAnchorId({ title: 'App Definition & Development', subtitle: 'Database  &  Storage', grouped: true })
    ).toBeUndefined();
  });

  it('returns undefined for unknown entries and empty fallback names', () => {
    expect(getAnchorId({ title: 'Unknown Category' })).toBeUndefined();
    expect(getAnchorId({ title: 'Unknown Category', subtitle: 'AI SIG', grouped: true })).toBeUndefined();
    expect(getAnchorId({ title: 'App Definition & Development', subtitle: '', grouped: true })).toBeUndefined();
    expect(getAnchorId({ title: 'App Definition & Development', subtitle: '---', grouped: true })).toBeUndefined();
    expect(getAnchorId({ title: 'Maturity', subtitle: 'Unknown', grouped: true })).toBeUndefined();
    expect(getAnchorId({ title: 'Tag', subtitle: 'Unknown' })).toBeUndefined();
    expect(getAnchorId({ title: 'Maturity' })).toBeUndefined();
    expect(getAnchorId({ title: 'Introduction & Overview' })).toBeUndefined();
  });
});

describe('normalizeName', () => {
  it.each([
    // Latin names
    ['Test Project', 'test-project'],
    ['Test  Project  ', 'test-project'],
    ['Test___Project', 'test-project'],
    ['Test-Project-', 'test-project'],
    ['Test--Project', 'test-project'],
    ['Test/Project', 'test-project'],
    ['Test@Project', 'test-project'],
    [' Foo', '-foo'],
    ['-Lead', '-lead'],
    ['(Beta) Tools', '-beta-tools'],
    ['C++', 'c++'],
    ['AI SIG', 'ai-sig'],
    // Non-latin and mixed names
    ['中文项目', '中文项目'],
    ['云原生计算基金会', '云原生计算基金会'],
    ['日本語プロジェクト', '日本語プロジェクト'],
    ['한국어 프로젝트', '한국어-프로젝트'],
    ['Проект', 'проект'],
    ['مشروع', 'مشروع'],
    ['中文 Project', '中文-project'],
    ['Test_中文_Project', 'test-中文-project'],
    ['Test---中文', 'test-中文'],
    ['Test/中文', 'test-中文'],
    ['Test@中文#Project', 'test-中文-project'],
    // Combining marks (Devanagari vowel signs and virama, NFD accent)
    ['हिन्दी', 'ह-न-द'],
    ['Cafe\u0301', 'cafe'],
    // Astral-plane letters and emojis
    ['𝐀𝐁𝐂 𐐀𐐨', '𝐀𝐁𝐂-𐐨𐐨'],
    ['a 🙂 b 🙂 ', 'a-b'],
    ['Rocket 🚀 Launch', 'rocket-launch'],
    // Case mappings (uppercase final sigma, multi-char lowercase)
    ['ΟΔΥΣΣΕΥΣ', 'οδυσσευσ'],
    ['İstanbul', 'i\u0307stanbul'],
    // Empty and separator-only names
    ['', ''],
    ['---', ''],
    ['   ', ''],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });
});
