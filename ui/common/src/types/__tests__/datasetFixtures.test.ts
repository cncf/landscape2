import { describe, expect, it } from 'vitest';

import { baseFixture, embedFixtures, fullFixture } from '../../test-utils';
import minimalBase from '../__fixtures__/minimal/base.json';
import minimalEmbedCategory from '../__fixtures__/minimal/embed_category_category.json';
import minimalEmbedSubcategory from '../__fixtures__/minimal/embed_category_category--subcategory.json';
import minimalFull from '../__fixtures__/minimal/full.json';
import minimalGames from '../__fixtures__/minimal/games.json';
import minimalGuide from '../__fixtures__/minimal/guide.json';
import minimalStats from '../__fixtures__/minimal/stats.json';
import type { BaseData, EmbedView, FullDataset, Guide, LandscapeGames, Stats } from '../generated';

// Item fields exposed through the API only, never written to full.json
const API_ONLY_ITEM_FIELDS = [
  'annotations',
  'chat_channel',
  'latest_annual_review_at',
  'latest_annual_review_url',
  'lfx_slug',
  'training_certifications',
  'training_type',
  'unnamed_organization',
];

describe('dataset fixtures', () => {
  it('accepts the minimal fixtures as the generated types', () => {
    // Assign the fixtures without a cast: the type-check fails when a field missing
    // from them is not optional in the generated types
    const base: BaseData = minimalBase;
    const embedViews: EmbedView[] = [minimalEmbedCategory, minimalEmbedSubcategory];
    const full: FullDataset = minimalFull;
    const games: LandscapeGames = minimalGames;
    const guide: Guide = minimalGuide;
    const stats: Stats = minimalStats;

    // Check the fixtures loaded
    expect(base.foundation).toBe('Foundation');
    expect(embedViews.map((view) => view.items.length)).toEqual([1, 1]);
    expect(full.items).toHaveLength(1);
    expect(games).toEqual({});
    expect(guide).toEqual({});
    expect(stats.generated_at).toBe('2024-06-01T00:00:00Z');
  });

  it('ships an items array in every embed view', () => {
    // Check every view, including the empty ones, has its items array
    const views = Object.values(embedFixtures);
    expect(views.length).toBeGreaterThan(0);
    for (const view of views) {
      expect(Array.isArray(view.items)).toBe(true);
    }

    // Check the empty subcategory view ships an empty items array
    expect(embedFixtures['category_category-1--subcategory-1-2']).toHaveProperty('items', []);
  });

  it('omits removed fields', () => {
    // Check the base dataset fields
    expect(baseFixture).not.toHaveProperty('featured_items');
    expect(baseFixture).not.toHaveProperty('members_category');

    // Check the full dataset items fields
    expect(fullFixture.items!.length).toBeGreaterThan(0);
    for (const item of fullFixture.items!) {
      for (const field of API_ONLY_ITEM_FIELDS) {
        expect(item).not.toHaveProperty(field);
      }
    }
  });
});
