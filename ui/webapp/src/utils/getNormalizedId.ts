import isUndefined from 'lodash/isUndefined';

import { Category, Subcategory } from '../types';

/**
 * Entry interface representing any entry for ID generation
 */
interface Entry {
  title: string; // Primary identifier (may be category, tag, maturity level, etc.)
  subtitle?: string; // Secondary identifier (may be subcategory, filter value, etc.)
  grouped?: boolean; // Whether this should use grouped display format
}

// Unicode-aware regex for valid characters: letters, numbers, hyphens, spaces, and plus signs
const VALID_CHARS = /[\p{L}\p{N}\- +]/u;
// Regex to match multiple consecutive hyphens
const MULTIPLE_HYPHENS = /-{2,}/g;

/**
 * Normalizes a text string to be URL-safe and consistent with backend normalization
 * This function mirrors the logic of the Rust normalize_name function in crates/core/src/util.rs
 *
 * @param text - The input text to normalize
 * @returns A normalized string with trimmed whitespace, lowercase characters, hyphens instead of spaces,
 *          and invalid characters replaced with hyphens
 */
const normalizeName = (text: string): string => {
  // Step 1: Trim whitespace and replace spaces with hyphens, then process each character
  let normalizedName = text
    .trim() // Remove leading and trailing whitespace
    .replace(/ /g, '-') // Convert spaces to hyphens
    .split('')
    .map((char) => {
      // Keep valid Unicode letters, numbers, hyphens, spaces, and plus signs
      if (VALID_CHARS.test(char)) {
        return char.toLowerCase(); // Convert to lowercase
      } else {
        return '-'; // Replace invalid characters with hyphens
      }
    })
    .join('');

  // Step 2: Replace multiple consecutive hyphens with single hyphen
  normalizedName = normalizedName.replace(MULTIPLE_HYPHENS, '-');

  // Step 3: Remove trailing hyphen if present
  if (normalizedName.endsWith('-')) {
    normalizedName = normalizedName.slice(0, -1);
  }

  return normalizedName;
};

/**
 * Generates a normalized ID for any landscape entry (categories, tags, maturity levels, etc.)
 *
 * @param entry - Entry object containing title, optional subtitle, and grouping info
 * @returns A normalized ID string in one of these formats:
 *   - "title-name" (for entries without subtitle)
 *   - "subtitle-name" (for entries with subtitle in non-grouped view)
 *   - "title-name--subtitle-name" (for grouped view or fallback)
 */
const getId = (entry: Entry): string => {
  // Try to find the title as a category in the base dataset
  const selectedCat = window.baseDS.categories.find((cat: Category) => cat.name === entry.title);

  if (!isUndefined(selectedCat)) {
    // Title matches a category in dataset - use pre-computed normalized names when possible

    if (isUndefined(entry.subtitle)) {
      // No subtitle - return the category's normalized name
      return selectedCat.normalized_name;
    } else {
      // Subtitle provided - check if it matches a subcategory
      const selectedSubcat = selectedCat.subcategories.find((subcat: Subcategory) => subcat.name === entry.subtitle);

      if (!isUndefined(selectedSubcat)) {
        // Subtitle matches a subcategory in dataset
        if (isUndefined(entry.grouped) || !entry.grouped) {
          // Non-grouped view - return just the subcategory's normalized name
          return selectedSubcat.normalized_name;
        } else {
          // Grouped view - return category--subcategory format
          return `${selectedCat.normalized_name}--${selectedSubcat.normalized_name}`;
        }
      } else {
        // Subtitle doesn't match any subcategory - generate normalized names
        return `${normalizeName(entry.title)}--${normalizeName(entry.subtitle)}`;
      }
    }
  } else {
    // Title doesn't match any category - generate normalized names for both parts
    return `${normalizeName(entry.title)}${!isUndefined(entry.subtitle) ? `--${normalizeName(entry.subtitle)}` : ''}`;
  }
};

export default getId;
