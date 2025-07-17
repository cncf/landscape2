import normalizeId from './buildNormalizedId';

// Mock window.baseDS for testing
const mockBaseDS = {
  finances_available: false,
  foundation: 'test-foundation',
  items: [],
  categories: [
    {
      name: 'App Definition & Development',
      normalized_name: 'app-definition-development',
      subcategories: [
        {
          name: 'Application Definition & Image Build',
          normalized_name: 'application-definition-image-build',
        },
        {
          name: 'Database',
          normalized_name: 'database',
        },
      ],
    },
    {
      name: 'Observability & Analysis',
      normalized_name: 'observability-analysis',
      subcategories: [
        {
          name: 'Monitoring',
          normalized_name: 'monitoring',
        },
        {
          name: 'Logging',
          normalized_name: 'logging',
        },
      ],
    },
    {
      name: 'Special Category',
      normalized_name: 'special-category',
      subcategories: [],
    },
  ],
};

// Mock window object
Object.defineProperty(window, 'baseDS', {
  value: mockBaseDS,
  writable: true,
  configurable: true,
});

describe('getNormalizedId', () => {
  beforeEach(() => {
    // Reset mock data before each test
    window.baseDS = mockBaseDS;
  });

  describe('normalizeName function (tested via getId)', () => {
    it('should normalize basic text with spaces', () => {
      const result = normalizeId({ title: 'Test Project', subtitle: 'Sub Category' });
      expect(result).toBe('test-project--sub-category');
    });

    it('should handle special characters and unicode', () => {
      const result = normalizeId({ title: 'Test@Project#1', subtitle: 'Special/Category' });
      expect(result).toBe('test-project-1--special-category');
    });

    it('should handle multiple consecutive hyphens', () => {
      const result = normalizeId({ title: 'Test___Project', subtitle: 'Sub--Category' });
      expect(result).toBe('test-project--sub-category');
    });

    it('should remove trailing hyphens', () => {
      const result = normalizeId({ title: 'Test Project-', subtitle: 'Sub Category@' });
      expect(result).toBe('test-project--sub-category');
    });

    it('should handle unicode characters', () => {
      const result = normalizeId({ title: '中文项目', subtitle: 'Test Project' });
      expect(result).toBe('中文项目--test-project');
    });

    it('should handle mixed unicode and latin characters', () => {
      const result = normalizeId({ title: 'Test_中文_Project', subtitle: 'Sub 한국어 Category' });
      expect(result).toBe('test-中文-project--sub-한국어-category');
    });

    it('should handle empty string edge case', () => {
      const result = normalizeId({ title: '', subtitle: '' });
      expect(result).toBe('--');
    });

    it('should handle string with only invalid characters', () => {
      const result = normalizeId({ title: '/@#$%', subtitle: '&*()' });
      expect(result).toBe('--');
    });

    it('should preserve plus signs as valid characters', () => {
      const result = normalizeId({ title: 'C++', subtitle: 'C# Programming' });
      expect(result).toBe('c++--c-programming');
    });

    it('should handle numbers correctly', () => {
      const result = normalizeId({ title: 'Version 2.0', subtitle: 'Release 1.5' });
      expect(result).toBe('version-2-0--release-1-5');
    });

    it('should trim leading and trailing whitespace', () => {
      const result = normalizeId({ title: '  Test Project  ', subtitle: '  Sub Category  ' });
      expect(result).toBe('test-project--sub-category');
    });
  });

  describe('getId function with dataset matches', () => {
    it('should return category normalized_name when title matches and no subtitle', () => {
      const result = normalizeId({ title: 'App Definition & Development' });
      expect(result).toBe('app-definition-development');
    });

    it('should return subcategory normalized_name in non-grouped view', () => {
      const result = normalizeId({
        title: 'App Definition & Development',
        subtitle: 'Database',
      });
      expect(result).toBe('database');
    });

    it('should return category--subcategory format in grouped view', () => {
      const result = normalizeId({
        title: 'App Definition & Development',
        subtitle: 'Database',
        grouped: true,
      });
      expect(result).toBe('app-definition-development--database');
    });

    it('should handle explicitly non-grouped view', () => {
      const result = normalizeId({
        title: 'App Definition & Development',
        subtitle: 'Database',
        grouped: false,
      });
      expect(result).toBe('database');
    });

    it('should fall back to normalized names when subcategory not found', () => {
      const result = normalizeId({
        title: 'App Definition & Development',
        subtitle: 'Unknown Subcategory',
      });
      expect(result).toBe('app-definition-development--unknown-subcategory');
    });

    it('should handle category with empty subcategories array', () => {
      const result = normalizeId({
        title: 'Special Category',
        subtitle: 'Any Subtitle',
      });
      expect(result).toBe('special-category--any-subtitle');
    });

    it('should handle multiple subcategories correctly', () => {
      const result1 = normalizeId({
        title: 'Observability & Analysis',
        subtitle: 'Monitoring',
      });
      const result2 = normalizeId({
        title: 'Observability & Analysis',
        subtitle: 'Logging',
      });
      expect(result1).toBe('monitoring');
      expect(result2).toBe('logging');
    });
  });

  describe('getId function without dataset matches', () => {
    it('should generate normalized names when category not found', () => {
      const result = normalizeId({ title: 'Unknown Category' });
      expect(result).toBe('unknown-category');
    });

    it('should generate normalized names for both title and subtitle when category not found', () => {
      const result = normalizeId({
        title: 'Unknown Category',
        subtitle: 'Unknown Subcategory',
      });
      expect(result).toBe('unknown-category--unknown-subcategory');
    });

    it('should handle special characters in unknown categories', () => {
      const result = normalizeId({
        title: 'New@Category#1',
        subtitle: 'Special/Subcategory',
      });
      expect(result).toBe('new-category-1--special-subcategory');
    });

    it('should generate consistent results for same input', () => {
      const result1 = normalizeId({ title: 'Test Category' });
      const result2 = normalizeId({ title: 'Test Category' });
      expect(result1).toBe(result2);
      expect(result1).toBe('test-category');
    });
  });

  describe('getId edge cases', () => {
    it('should handle undefined subtitle', () => {
      const result = normalizeId({
        title: 'Test Category',
        subtitle: undefined,
      });
      expect(result).toBe('test-category');
    });

    it('should handle undefined grouped flag', () => {
      const result = normalizeId({
        title: 'App Definition & Development',
        subtitle: 'Database',
        grouped: undefined,
      });
      expect(result).toBe('database');
    });

    it('should handle case sensitivity in category matching', () => {
      const result = normalizeId({ title: 'app definition & development' });
      expect(result).toBe('app-definition-development');
    });

    it('should handle case sensitivity in subcategory matching', () => {
      const result = normalizeId({
        title: 'App Definition & Development',
        subtitle: 'database',
      });
      expect(result).toBe('app-definition-development--database');
    });

    it('should handle whitespace in category names', () => {
      const result = normalizeId({ title: '  App Definition & Development  ' });
      expect(result).toBe('app-definition-development');
    });

    it('should handle null and undefined inputs gracefully', () => {
      // @ts-expect-error - Testing runtime behavior
      expect(() => normalizeId(null)).toThrow();
      // @ts-expect-error - Testing runtime behavior
      expect(() => normalizeId(undefined)).toThrow();
    });
  });

  describe('getId with missing window.baseDS', () => {
    it('should handle missing baseDS gracefully', () => {
      // @ts-expect-error - Intentionally setting to undefined for testing
      window.baseDS = undefined;

      expect(() => {
        normalizeId({ title: 'Test Category' });
      }).toThrow();
    });

    it('should handle empty categories array', () => {
      window.baseDS = {
        finances_available: false,
        foundation: 'test-foundation',
        items: [],
        categories: [],
      };

      const result = normalizeId({ title: 'Test Category' });
      expect(result).toBe('test-category');
    });

    it('should handle malformed baseDS', () => {
      // @ts-expect-error - Testing malformed data
      window.baseDS = { categories: null };

      expect(() => {
        normalizeId({ title: 'Test Category' });
      }).toThrow();
    });
  });

  describe('getId with complex scenarios', () => {
    it('should prioritize exact matches over normalized generation', () => {
      const result = normalizeId({
        title: 'Observability & Analysis',
        subtitle: 'Monitoring',
      });
      expect(result).toBe('monitoring');
    });

    it('should handle long category and subcategory names', () => {
      const longTitle = 'Very Long Category Name With Many Words And Special Characters!@#';
      const longSubtitle = 'Another Very Long Subcategory Name With Special Characters$%^';

      const result = normalizeId({
        title: longTitle,
        subtitle: longSubtitle,
      });
      expect(result).toBe(
        'very-long-category-name-with-many-words-and-special-characters--another-very-long-subcategory-name-with-special-characters'
      );
    });

    it('should handle entries with only spaces (trimmed to empty)', () => {
      const result = normalizeId({
        title: '   ',
        subtitle: '   ',
      });
      expect(result).toBe('--');
    });

    it('should handle mixed valid and invalid characters', () => {
      const result = normalizeId({
        title: 'Test123-Project_Name',
        subtitle: 'Sub+Category@2024',
      });
      expect(result).toBe('test123-project-name--sub+category-2024');
    });

    it('should be consistent with Rust normalize_name test cases', () => {
      // Test cases from the Rust implementation
      const testCases = [
        { input: 'Test Project', expected: 'test-project' },
        { input: 'Test  Project  ', expected: 'test-project' },
        { input: 'Test___Project', expected: 'test-project' },
        { input: 'Test-Project-', expected: 'test-project' },
        { input: 'Test--Project', expected: 'test-project' },
        { input: 'Test/Project', expected: 'test-project' },
        { input: 'Test@Project', expected: 'test-project' },
        { input: 'a 🙂 b 🙂 ', expected: 'a-b' },
        { input: '中文项目', expected: '中文项目' },
        { input: '日本語プロジェクト', expected: '日本語プロジェクト' },
        { input: '한국어 프로젝트', expected: '한국어-프로젝트' },
        { input: 'Проект', expected: 'проект' },
        { input: 'مشروع', expected: 'مشروع' },
        { input: '中文 Project', expected: '中文-project' },
        { input: 'Test_中文_Project', expected: 'test-中文-project' },
        { input: 'Test---中文', expected: 'test-中文' },
        { input: 'Test/中文', expected: 'test-中文' },
        { input: 'Test@中文#Project', expected: 'test-中文-project' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizeId({ title: input });
        expect(result).toBe(expected);
      });
    });
  });
});
