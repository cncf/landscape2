import baseJson from '../types/__fixtures__/base.json';
import embedCategoryJson from '../types/__fixtures__/embed_category_category-1.json';
import embedSubcategoryJson from '../types/__fixtures__/embed_category_category-1--subcategory-1-1.json';
import embedEmptySubcategoryJson from '../types/__fixtures__/embed_category_category-1--subcategory-1-2.json';
import embedMaturityAllJson from '../types/__fixtures__/embed_maturity_all.json';
import embedMaturityJson from '../types/__fixtures__/embed_maturity_early-stage.json';
import embedTagAllJson from '../types/__fixtures__/embed_tag_all.json';
import embedTagJson from '../types/__fixtures__/embed_tag_observability.json';
import fullJson from '../types/__fixtures__/full.json';
import gamesJson from '../types/__fixtures__/games.json';
import guideJson from '../types/__fixtures__/guide.json';
import statsJson from '../types/__fixtures__/stats.json';
import type { BaseData, EmbedView, FullDataset, Guide, LandscapeGames, Stats } from '../types/generated';

/** Base dataset fixture (`base.json`), written by the landscape2-core contract tests. */
export const baseFixture = asDataset<BaseData>(baseJson);

/**
 * Embed views fixtures, one per view kind plus an empty view, keyed by their embed key
 * (`embed_<key>.json`).
 */
export const embedFixtures: Record<string, EmbedView> = {
  'category_category-1': asDataset<EmbedView>(embedCategoryJson),
  'category_category-1--subcategory-1-1': asDataset<EmbedView>(embedSubcategoryJson),
  'category_category-1--subcategory-1-2': asDataset<EmbedView>(embedEmptySubcategoryJson),
  maturity_all: asDataset<EmbedView>(embedMaturityAllJson),
  'maturity_early-stage': asDataset<EmbedView>(embedMaturityJson),
  tag_all: asDataset<EmbedView>(embedTagAllJson),
  tag_observability: asDataset<EmbedView>(embedTagJson),
};

/** Full dataset fixture (`full.json`), written by the landscape2-core contract tests. */
export const fullFixture = asDataset<FullDataset>(fullJson);

/** Games fixture (`games.json`), written by the landscape2-core contract tests. */
export const gamesFixture = asDataset<LandscapeGames>(gamesJson);

/** Guide fixture (`guide.json`), written by the landscape2-core contract tests. */
export const guideFixture = asDataset<Guide>(guideJson);

/** Stats dataset fixture (`stats.json`), written by the landscape2-core contract tests. */
export const statsFixture = asDataset<Stats>(statsJson);

/**
 * Types a dataset fixture JSON module. This is the only cast of the fixtures, and it
 * is needed because TypeScript widens the string literals of JSON modules (for
 * example `view_mode: string`), so `const base: BaseData = json` cannot compile. The
 * shape is guaranteed anyway: Rust writes these files from the same structs the
 * generated types come from, and its contract tests fail when they are stale.
 */
function asDataset<T>(json: unknown): T {
  return json as T;
}
