import { describe, expect, it } from 'vitest';

import { createBaseData } from '../../test-utils/fixtures';
import isSectionInGuide from '../isSectionInGuide';

/** Guide summary with one category and one of its subcategories. */
const GUIDE_SUMMARY = { 'Category A': ['Subcategory 1'] };

describe('isSectionInGuide', () => {
  it.each([
    ['a category in the guide', GUIDE_SUMMARY, 'Category A', undefined, true],
    ['a subcategory in the guide', GUIDE_SUMMARY, 'Category A', 'Subcategory 1', true],
    ['a subcategory missing from the guide', GUIDE_SUMMARY, 'Category A', 'Subcategory 2', false],
    ['a category missing from the guide', GUIDE_SUMMARY, 'Category B', undefined, false],
    ['a subcategory of a category missing from the guide', GUIDE_SUMMARY, 'Category B', 'Subcategory 1', false],
    ['an empty guide summary', {}, 'Category A', undefined, false],
    ['a landscape without a guide', undefined, 'Category A', 'Subcategory 1', false],
  ])('checks %s', (_, guideSummary, categoryName, subcategoryName, expected) => {
    window.baseDS = createBaseData({ guide_summary: guideSummary });

    expect(isSectionInGuide(categoryName, subcategoryName)).toBe(expected);
  });
});
