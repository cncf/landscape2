import { describe, expect, it } from 'vitest';

import {
  Alignment,
  ClassifyType,
  DEFAULT_ITEM_NAME_SIZE,
  DEFAULT_ITEMS_SIZE,
  DEFAULT_ITEMS_STYLE_VIEW,
  DEFAULT_TITLE_SIZE,
  FontFamily,
  Size,
  Style,
} from '../params';
import { type EmbedConfig, parseEmbedConfig } from '../parseEmbedConfig';

describe('parseEmbedConfig', () => {
  it('reads every param of an embed setup url', () => {
    const config = parseEmbedConfig(
      '?base-path=/landscape&classify=category&key=category-1&headers=true&category-header=false' +
        '&category-in-subcategory=true&title-uppercase=true&title-alignment=center&title-font-family=monospace' +
        '&title-font-size=20&style=bordered&bg-color=transparent&fg-color=%23000000&item-modal=true' +
        '&hide-organization-section=true&item-name=true&size=lg&items-alignment=right&item-name-font-size=14' +
        '&items-spacing=8'
    );

    expect(config).toEqual<EmbedConfig>({
      basePath: '/landscape',
      categories: [],
      classifyBy: ClassifyType.Category,
      displayCategoryInSubcategory: true,
      displayCategoryTitle: false,
      displayHeader: true,
      displayItemModal: true,
      displayItemName: true,
      hideOrganizationSection: true,
      isBgTransparent: true,
      itemNameSize: 14,
      itemsAlignment: Alignment.Right,
      itemsSize: Size.Large,
      itemsStyle: Style.BorderedBasic,
      key: 'category-1',
      subcategories: [],
      titleAlignment: Alignment.Center,
      titleBgColor: 'transparent',
      titleFgColor: '#000000',
      titleFontFamily: FontFamily.Monospace,
      titleSize: 20,
      uppercaseTitle: true,
      itemsSpacing: 8,
    });
  });

  it.each([
    ['an invalid style', '?key=category-1&style=fancy'],
    ['an invalid size', '?key=category-1&size=xxl'],
    ['an invalid classification', '?classify=stars&key=category-1'],
    ['a protocol-relative base path', '?key=category-1&base-path=//evil.example'],
    ['an absolute url base path', '?key=category-1&base-path=https://evil.example'],
    ['a base path with a parent segment', '?key=category-1&base-path=/a/../b'],
    ['no key', '?classify=maturity'],
    ['an empty key', '?key='],
    ['no key nor categories', '?classify=category'],
    ['blank categories only', '?classify=category&categories=,%20,'],
    ['categories outside the category classification', '?classify=tag&categories=category-1,category-2'],
  ])('returns null for %s', (_, search) => {
    expect(parseEmbedConfig(search)).toBeNull();
  });

  it.each([
    ['/', ''],
    ['/landscape/', '/landscape'],
  ])('drops the trailing slashes of base-path=%s', (value, basePath) => {
    expect(parseEmbedConfig(`?key=category-1&base-path=${value}`)?.basePath).toBe(basePath);
  });

  it.each([
    ['a grid url without style nor size', '?key=category-1', DEFAULT_ITEMS_STYLE_VIEW, DEFAULT_ITEMS_SIZE],
    ['a card url without size', '?key=category-1&style=card', Style.Card, DEFAULT_ITEMS_SIZE],
    ['a url with size and no style', '?key=category-1&size=xs', DEFAULT_ITEMS_STYLE_VIEW, Size.XSmall],
  ])('uses the default style and size for %s', (_, search, itemsStyle, itemsSize) => {
    expect(parseEmbedConfig(search)).toMatchObject({ itemsSize, itemsStyle });
  });

  it.each([
    ['9', DEFAULT_TITLE_SIZE],
    ['10', 10],
    ['60', 60],
    ['61', DEFAULT_TITLE_SIZE],
    ['big', DEFAULT_TITLE_SIZE],
  ])('reads title-font-size=%s as %d', (value, titleSize) => {
    expect(parseEmbedConfig(`?key=category-1&title-font-size=${value}`)?.titleSize).toBe(titleSize);
  });

  it.each([
    ['without item-name', '?key=category-1&item-name-font-size=20', DEFAULT_ITEM_NAME_SIZE],
    ['with item-name=false', '?key=category-1&item-name=false&item-name-font-size=20', DEFAULT_ITEM_NAME_SIZE],
    ['below the minimum', '?key=category-1&item-name=true&item-name-font-size=9', DEFAULT_ITEM_NAME_SIZE],
    ['at the minimum', '?key=category-1&item-name=true&item-name-font-size=10', 10],
    ['at the maximum', '?key=category-1&item-name=true&item-name-font-size=40', 40],
    ['above the maximum', '?key=category-1&item-name=true&item-name-font-size=41', DEFAULT_ITEM_NAME_SIZE],
  ])('reads the item name size %s', (_, search, itemNameSize) => {
    expect(parseEmbedConfig(search)?.itemNameSize).toBe(itemNameSize);
  });

  it.each([
    ['0', 0],
    ['12', 12],
    ['-1', undefined],
    ['NaN', undefined],
    ['wide', undefined],
  ])('reads items-spacing=%s as %s', (value, itemsSpacing) => {
    expect(parseEmbedConfig(`?key=category-1&items-spacing=${value}`)?.itemsSpacing).toBe(itemsSpacing);
  });

  it('leaves the spacing unset without items-spacing', () => {
    expect(parseEmbedConfig('?key=category-1')).not.toHaveProperty('itemsSpacing');
  });

  it.each([
    ['without item-modal', '?key=category-1&hide-organization-section=true', false],
    ['with item-modal=false', '?key=category-1&item-modal=false&hide-organization-section=true', false],
    ['with item-modal=true', '?key=category-1&item-modal=true&hide-organization-section=true', true],
  ])('reads hide-organization-section %s', (_, search, hideOrganizationSection) => {
    expect(parseEmbedConfig(search)?.hideOrganizationSection).toBe(hideOrganizationSection);
  });

  it('deduplicates the categories and drops the blank ones', () => {
    const config = parseEmbedConfig('?classify=category&categories=category-1,,%20category-2%20,category-1,%20');

    expect(config).toMatchObject({ categories: ['category-1', 'category-2'], key: 'category-1__category-2' });
  });

  it('uses the only category as the key', () => {
    const config = parseEmbedConfig('?classify=category&categories=category-1,category-1');

    expect(config).toMatchObject({ categories: ['category-1'], key: 'category-1' });
  });

  it('ignores the key of a multi-category view', () => {
    expect(parseEmbedConfig('?categories=category-1,category-2&key=category-3')?.key).toBe('category-1__category-2');
  });

  it('reads the subcategories selected for a key', () => {
    const config = parseEmbedConfig('?classify=category&key=category-1&subcategories=sub-1,%20sub-2,,sub-1');

    expect(config).toMatchObject({ key: 'category-1', subcategories: ['sub-1', 'sub-2'] });
  });

  it.each([
    ['outside the category classification', '?classify=maturity&key=graduated&subcategories=sub-1'],
    ['without a key', '?classify=category&categories=category-1&subcategories=sub-1'],
  ])('ignores the subcategories %s', (_, search) => {
    expect(parseEmbedConfig(search)?.subcategories).toEqual([]);
  });

  it('falls back to the defaults for unknown alignments and font families', () => {
    const config = parseEmbedConfig('?key=category-1&title-alignment=up&items-alignment=down&title-font-family=x');

    expect(config).toMatchObject({
      itemsAlignment: Alignment.Left,
      titleAlignment: Alignment.Left,
      titleFontFamily: FontFamily.SansSerif,
    });
  });

  it('shows no headers without headers=true', () => {
    expect(parseEmbedConfig('?key=category-1')?.displayHeader).toBe(false);
  });
});
