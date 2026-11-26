import { describe, expect, it } from 'vitest';

import type { ClassificationOption } from '../../types/generated';
import embedKeysFixture from '../__fixtures__/embed-keys.json';
import { buildEmbedKey, buildMultiCategoryKey, type EmbedKeySelection } from '../keys';

/** Shared embed keys fixture case, also checked by the Rust embed dataset tests. */
interface EmbedKeyCase {
  classify: 'category' | 'maturity' | 'tag';
  category?: string;
  file: string;
  key: string;
  subcategory?: string;
  value?: string;
}

/** Category option with its subcategories, as shipped in the base dataset. */
interface CategoryOption extends ClassificationOption {
  subcategories: ClassificationOption[];
}

const cases = embedKeysFixture as EmbedKeyCase[];

describe('buildEmbedKey', () => {
  it('matches the shared fixture keys', () => {
    // Take the base options from the fixture, as Rust ships them normalized
    const categories = getCategoryOptions();
    const maturityOptions = getClassificationOptions('maturity');
    const tagOptions = getClassificationOptions('tag');

    for (const testCase of cases) {
      // Select the options by their display names
      let selection: EmbedKeySelection;
      if (testCase.classify === 'category') {
        const category = categories.find((option) => option.name === testCase.category)!;
        const subcategory = category.subcategories.find((option) => option.name === testCase.subcategory);
        selection = { classify: 'category', category, subcategory };
      } else {
        const options = testCase.classify === 'maturity' ? maturityOptions : tagOptions;
        const option = options.find((candidate) => candidate.name === testCase.value);
        selection = { classify: testCase.classify, option };
      }

      // Verify the key and the embed file fetched for it
      const key = buildEmbedKey(selection);
      expect(key).toBe(testCase.key);
      expect(`embed_${testCase.classify}_${key}.json`).toBe(testCase.file);
    }
  });
});

describe('buildMultiCategoryKey', () => {
  it('joins the categories with a double underscore in their order', () => {
    expect(buildMultiCategoryKey(['category-2', 'category-1', 'category-3'])).toBe(
      'category-2__category-1__category-3'
    );
  });
});

/** Returns the category options of the fixture, splitting their keys into normalized names. */
const getCategoryOptions = (): CategoryOption[] => {
  const categories: CategoryOption[] = [];
  for (const testCase of cases) {
    if (testCase.classify !== 'category') continue;
    const [categoryNormalizedName, subcategoryNormalizedName] = testCase.key.split('--');
    let category = categories.find((option) => option.name === testCase.category);
    if (!category) {
      category = { name: testCase.category!, normalized_name: categoryNormalizedName, subcategories: [] };
      categories.push(category);
    }
    if (testCase.subcategory) {
      category.subcategories.push({ name: testCase.subcategory, normalized_name: subcategoryNormalizedName });
    }
  }
  return categories;
};

/** Returns the maturity or TAG options of the fixture, skipping the all options cases. */
const getClassificationOptions = (classify: 'maturity' | 'tag'): ClassificationOption[] =>
  cases
    .filter((testCase) => testCase.classify === classify && testCase.value !== undefined)
    .map((testCase) => ({ name: testCase.value!, normalized_name: testCase.key }));
