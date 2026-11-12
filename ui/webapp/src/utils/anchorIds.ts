import isUndefined from 'lodash/isUndefined';

import { Guide } from '../types';

/** Anchor id of the items without a maturity. */
export const UNDEFINED_MATURITY_ANCHOR_ID = 'maturity--undefined';

/** Anchor id of the items without a TAG. */
export const UNDEFINED_TAG_ANCHOR_ID = 'tag--undefined';

/** Name of the bucket holding the items without a maturity or TAG. */
const UNDEFINED_BUCKET = 'undefined';

/** Entry an anchor id is resolved for. */
export interface AnchorEntry {
  /** Category name, guide category name, or the `Maturity`/`Tag` menu title. */
  title: string;
  /** Subcategory name, guide subcategory name, or maturity/TAG option name. */
  subtitle?: string;
  /** Whether a subcategory id is prefixed with its category id (`category--subcategory`). */
  grouped?: boolean;
}

/** Entry carrying the normalized name shipped in the datasets. */
interface NormalizedEntry {
  normalized_name: string;
}

/**
 * Resolves the anchor id of an entry from the normalized names shipped in the
 * datasets. Landscape categories are checked first, then the guide entries and
 * finally the maturity and TAG options.
 *
 * @param entry - Entry to resolve
 * @param guide - Guide whose entries can be resolved too, when available
 * @returns The anchor id, or `undefined` when the entry is unknown
 */
export const getAnchorId = (entry: AnchorEntry, guide?: Guide): string | undefined =>
  getCategoryAnchorId(entry) ?? getGuideAnchorId(entry, guide) ?? getClassificationAnchorId(entry);

/** Resolves the anchor id of a landscape category or subcategory. */
const getCategoryAnchorId = (entry: AnchorEntry): string | undefined => {
  const category = (window.baseDS.categories ?? []).find((c) => c.name === entry.title);
  if (isUndefined(category)) return;

  const subcategory = category.subcategories.find((s) => s.name === entry.subtitle);
  return joinAnchorId(entry, category, subcategory);
};

/** Resolves the anchor id of a maturity or TAG option, including the bucket of the items without one. */
const getClassificationAnchorId = (entry: AnchorEntry): string | undefined => {
  const classify = entry.title.toLowerCase();
  if ((classify !== 'maturity' && classify !== 'tag') || isUndefined(entry.subtitle)) return;

  if (entry.subtitle === UNDEFINED_BUCKET) {
    return classify === 'maturity' ? UNDEFINED_MATURITY_ANCHOR_ID : UNDEFINED_TAG_ANCHOR_ID;
  }
  const options = (classify === 'maturity' ? window.baseDS.maturity_options : window.baseDS.tag_options) ?? [];
  const option = options.find((o) => o.name === entry.subtitle);
  return isUndefined(option) ? undefined : `${classify}--${option.normalized_name}`;
};

/** Resolves the anchor id of a guide category or subcategory. */
const getGuideAnchorId = (entry: AnchorEntry, guide?: Guide): string | undefined => {
  const category = (guide?.categories ?? []).find((c) => c.category === entry.title);
  if (isUndefined(category)) return;

  const subcategory = (category.subcategories ?? []).find((s) => s.subcategory === entry.subtitle);
  return joinAnchorId(entry, category, subcategory);
};

/** Joins the normalized names of a resolved category and subcategory into an anchor id. */
const joinAnchorId = (
  entry: AnchorEntry,
  category: NormalizedEntry,
  subcategory?: NormalizedEntry
): string | undefined => {
  if (isUndefined(entry.subtitle)) return category.normalized_name;
  if (isUndefined(subcategory)) return;
  return entry.grouped ? `${category.normalized_name}--${subcategory.normalized_name}` : subcategory.normalized_name;
};
