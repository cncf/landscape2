import { describe, expect, it } from 'vitest';

import { buildEmbedUrl } from '../buildEmbedUrl';
import {
  Alignment,
  ClassifyType,
  DEFAULT_DISPLAY_CATEGORY_HEADER,
  DEFAULT_DISPLAY_CATEGORY_IN_SUBCATEGORY,
  DEFAULT_DISPLAY_HEADER,
  DEFAULT_DISPLAY_ITEM_MODAL,
  DEFAULT_DISPLAY_ITEM_NAME,
  DEFAULT_ITEM_NAME_SIZE,
  DEFAULT_ITEMS_ALIGNMENT,
  DEFAULT_ITEMS_SIZE,
  DEFAULT_ITEMS_STYLE_VIEW,
  DEFAULT_TITLE_ALIGNMENT,
  DEFAULT_TITLE_BG_COLOR,
  DEFAULT_TITLE_FG_COLOR,
  DEFAULT_TITLE_FONT_FAMILY,
  DEFAULT_TITLE_SIZE,
  DEFAULT_UPPERCASE_TITLE,
  FontFamily,
  Size,
  Style,
} from '../params';
import { type EmbedConfig, parseEmbedConfig } from '../parseEmbedConfig';

const EMBED_BASE_URL = 'https://landscape.example.org/embed/embed.html';

describe('buildEmbedUrl', () => {
  it('writes a single subcategory view as its category--subcategory key', () => {
    const params = buildParams({ key: 'category-1--subcategory-1' });

    expect(params.get('key')).toBe('category-1--subcategory-1');
    expect(params.has('subcategories')).toBe(false);
    expect(params.has('categories')).toBe(false);
  });

  it('writes the subcategories of a category view with several subcategories', () => {
    const params = buildParams({ key: 'category-1', subcategories: ['subcategory-1', 'subcategory-2'] });

    expect(params.get('key')).toBe('category-1');
    expect(params.get('subcategories')).toBe('subcategory-1,subcategory-2');
  });

  it('writes the categories and no key for a view with several categories', () => {
    const params = buildParams({ categories: ['category-1', 'category-2'], key: 'category-1__category-2' });

    expect(params.get('categories')).toBe('category-1,category-2');
    expect(params.has('key')).toBe(false);
    expect(params.has('subcategories')).toBe(false);
  });

  it('writes the key of a maturity view', () => {
    const params = buildParams({ classifyBy: ClassifyType.Maturity, key: 'graduated' });

    expect(params.get('classify')).toBe('maturity');
    expect(params.get('key')).toBe('graduated');
  });

  it('omits the size, alignment, spacing and name params for the Card style', () => {
    const params = buildParams({ displayItemName: true, itemsSpacing: 8, itemsStyle: Style.Card });

    expect(params.get('style')).toBe('card');
    ['size', 'items-alignment', 'items-spacing', 'item-name', 'item-name-font-size'].forEach((name) => {
      expect(params.has(name)).toBe(false);
    });
  });

  it('writes the size, alignment and name params for the other styles', () => {
    const params = buildParams({
      displayItemName: true,
      itemNameSize: 14,
      itemsAlignment: Alignment.Right,
      itemsSize: Size.Large,
      itemsStyle: Style.BorderedBasic,
    });

    expect(params.get('size')).toBe('lg');
    expect(params.get('items-alignment')).toBe('right');
    expect(params.get('item-name')).toBe('true');
    expect(params.get('item-name-font-size')).toBe('14');
  });

  it('omits the item name size when the name is not displayed', () => {
    const params = buildParams({ displayItemName: false });

    expect(params.get('item-name')).toBe('false');
    expect(params.has('item-name-font-size')).toBe(false);
  });

  it.each([
    ['default spacing', undefined, null],
    ['custom spacing', 8, '8'],
    ['custom spacing of zero', 0, '0'],
  ])('writes the items spacing only when chosen (%s)', (_, itemsSpacing, expected) => {
    expect(buildParams({ itemsSpacing }).get('items-spacing')).toBe(expected);
  });

  it.each(Object.values(Style).flatMap((itemsStyle) => [true, false].map((flag) => [itemsStyle, flag] as const)))(
    'writes item-modal following the flag for the %s style (flag %s)',
    (itemsStyle, displayItemModal) => {
      expect(buildParams({ displayItemModal, itemsStyle }).get('item-modal')).toBe(String(displayItemModal));
    }
  );

  it('writes hide-organization-section only along with the item modal', () => {
    expect(
      buildParams({ displayItemModal: true, hideOrganizationSection: true }).get('hide-organization-section')
    ).toBe('true');
    expect(
      buildParams({ displayItemModal: false, hideOrganizationSection: true }).get('hide-organization-section')
    ).toBe('false');
  });

  it('omits base-path when it is empty', () => {
    expect(buildParams({ basePath: '' }).has('base-path')).toBe(false);
    expect(buildParams({ basePath: '/landscape' }).get('base-path')).toBe('/landscape');
  });

  it('builds the url on the embed base url', () => {
    const url = new URL(buildEmbedUrl(defaultConfig(), EMBED_BASE_URL));

    expect(`${url.origin}${url.pathname}`).toBe(EMBED_BASE_URL);
  });

  it.each<[string, EmbedConfig]>([
    ['the default config', defaultConfig()],
    ['a single subcategory view', defaultConfig({ key: 'category-1--subcategory-1' })],
    ['a several subcategories view', defaultConfig({ subcategories: ['subcategory-1', 'subcategory-2'] })],
    [
      'a several categories view',
      defaultConfig({ categories: ['category-1', 'category-2'], key: 'category-1__category-2' }),
    ],
    ['a maturity view', defaultConfig({ classifyBy: ClassifyType.Maturity, key: 'all' })],
    ['a TAG view', defaultConfig({ classifyBy: ClassifyType.TAG, key: 'observability' })],
    ['a Card view with the item modal', defaultConfig({ displayItemModal: true, itemsStyle: Style.Card })],
    [
      'a fully customized view',
      defaultConfig({
        basePath: '/landscape',
        displayCategoryInSubcategory: true,
        displayCategoryTitle: false,
        displayHeader: false,
        displayItemModal: true,
        displayItemName: true,
        hideOrganizationSection: true,
        isBgTransparent: true,
        itemNameSize: 20,
        itemsAlignment: Alignment.Center,
        itemsSize: Size.XSmall,
        itemsStyle: Style.Basic,
        titleAlignment: Alignment.Right,
        titleBgColor: 'transparent',
        titleFgColor: '#000000',
        titleFontFamily: FontFamily.Monospace,
        titleSize: 30,
        uppercaseTitle: true,
        itemsSpacing: 4,
      }),
    ],
  ])('round trips %s through parseEmbedConfig', (_, config) => {
    const url = new URL(buildEmbedUrl(config, EMBED_BASE_URL));

    expect(parseEmbedConfig(url.search)).toEqual(config);
  });
});

// Helpers.

/** Builds the url of the default config with the overrides provided and returns its params. */
const buildParams = (overrides: Partial<EmbedConfig>): URLSearchParams =>
  new URL(buildEmbedUrl(defaultConfig(overrides), EMBED_BASE_URL)).searchParams;

/**
 * Creates a single category view config with the default values, normalized
 * the way `parseEmbedConfig` returns them; overrides replace the default fields.
 */
const defaultConfig = (overrides: Partial<EmbedConfig> = {}): EmbedConfig => ({
  basePath: '',
  categories: [],
  classifyBy: ClassifyType.Category,
  displayCategoryInSubcategory: DEFAULT_DISPLAY_CATEGORY_IN_SUBCATEGORY,
  displayCategoryTitle: DEFAULT_DISPLAY_CATEGORY_HEADER,
  displayHeader: DEFAULT_DISPLAY_HEADER,
  displayItemModal: DEFAULT_DISPLAY_ITEM_MODAL,
  displayItemName: DEFAULT_DISPLAY_ITEM_NAME,
  hideOrganizationSection: false,
  isBgTransparent: false,
  itemNameSize: DEFAULT_ITEM_NAME_SIZE,
  itemsAlignment: DEFAULT_ITEMS_ALIGNMENT,
  itemsSize: DEFAULT_ITEMS_SIZE,
  itemsStyle: DEFAULT_ITEMS_STYLE_VIEW,
  key: 'category-1',
  subcategories: [],
  titleAlignment: DEFAULT_TITLE_ALIGNMENT,
  titleBgColor: DEFAULT_TITLE_BG_COLOR,
  titleFgColor: DEFAULT_TITLE_FG_COLOR,
  titleFontFamily: DEFAULT_TITLE_FONT_FAMILY,
  titleSize: DEFAULT_TITLE_SIZE,
  uppercaseTitle: DEFAULT_UPPERCASE_TITLE,
  ...overrides,
});
