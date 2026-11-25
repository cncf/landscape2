import isUndefined from 'lodash/isUndefined';

import { Guide } from '../types';

/** Anchor id of the items without a maturity. */
export const UNDEFINED_MATURITY_ANCHOR_ID = 'maturity--undefined';

/** Anchor id of the items without a TAG. */
export const UNDEFINED_TAG_ANCHOR_ID = 'tag--undefined';

/** Name of the bucket holding the items without a maturity or TAG. */
const UNDEFINED_BUCKET = 'undefined';

// Characters kept (lowercased) when normalizing a fallback subcategory name
const VALID_NORMALIZED_CHAR = /^[\p{L}\p{N}+]$/u;

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
 * datasets. Landscape categories are checked first, then the guide entries,
 * then the maturity and TAG options, and finally a fallback for undeclared
 * subcategories of a declared category.
 *
 * @param entry - Entry to resolve
 * @param guide - Guide whose entries can be resolved too, when available
 * @returns The anchor id, or `undefined` when the entry is unknown
 */
export const getAnchorId = (entry: AnchorEntry, guide?: Guide): string | undefined =>
  getCategoryAnchorId(entry) ??
  getGuideAnchorId(entry, guide) ??
  getClassificationAnchorId(entry) ??
  getFallbackSubcategoryAnchorId(entry);

/**
 * Normalizes a name following the backend's `normalize_name` rules: letters,
 * digits and `+` are kept lowercased, any other run of characters becomes a
 * single `-`, and a trailing `-` is dropped.
 *
 * @param value - Raw name to normalize
 * @returns The normalized name
 */
export const normalizeName = (value: string): string => {
  let normalized = '';
  for (const ch of value) {
    if (VALID_NORMALIZED_CHAR.test(ch)) {
      normalized += ch.toLowerCase();
    } else if (!normalized.endsWith('-')) {
      normalized += '-';
    }
  }
  return normalized.endsWith('-') ? normalized.slice(0, -1) : normalized;
};

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

/** Resolves a fallback anchor id for an undeclared subcategory of a declared landscape category. */
const getFallbackSubcategoryAnchorId = (entry: AnchorEntry): string | undefined => {
  if (isUndefined(entry.subtitle)) return;

  const category = (window.baseDS.categories ?? []).find((c) => c.name === entry.title);
  if (isUndefined(category)) return;

  const normalized = normalizeName(entry.subtitle);
  // Avoid colliding with a declared subcategory's anchor id
  if (normalized === '' || category.subcategories.some((s) => s.normalized_name === normalized)) return;

  return joinAnchorId(entry, category, { normalized_name: normalized });
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
