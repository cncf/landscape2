import {
  BASE_PATH_PARAM,
  CATEGORIES_PARAM,
  CLASSIFY_BY_PARAM,
  ClassifyType,
  DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM,
  DISPLAY_HEADER_CATEGORY_PARAM,
  DISPLAY_HEADER_PARAM,
  DISPLAY_ITEM_MODAL_PARAM,
  DISPLAY_ITEM_NAME_PARAM,
  HIDE_ORGANIZATION_SECTION_PARAM,
  ITEM_NAME_SIZE_PARAM,
  ITEMS_ALIGNMENT_PARAM,
  ITEMS_SIZE_PARAM,
  ITEMS_SPACING_PARAM,
  ITEMS_STYLE_PARAM,
  KEY_PARAM,
  Style,
  SUBCATEGORIES_PARAM,
  TITLE_ALIGNMENT_PARAM,
  TITLE_BGCOLOR_PARAM,
  TITLE_FGCOLOR_PARAM,
  TITLE_FONT_FAMILY_PARAM,
  TITLE_SIZE_PARAM,
  UPPERCASE_TITLE_PARAM,
} from './params';
import type { EmbedConfig } from './parseEmbedConfig';

/**
 * Builds the url of the embed view described by the configuration, the
 * inverse of `parseEmbedConfig`.
 *
 * Multi-category views are written as `categories` (their key is derived from
 * them), other views as `key`. The size, alignment, spacing and item name
 * params are only written for the non-Card styles, the item name size only
 * when the name is displayed, the spacing only when set and `base-path` only
 * when not empty.
 *
 * @param config - Configuration of the embed view
 * @param embedBaseUrl - Url of the embed page (e.g. `https://example.org/embed/embed.html`)
 * @returns The embed page url with the configuration params
 */
export const buildEmbedUrl = (config: EmbedConfig, embedBaseUrl: string): string => {
  const params = new URLSearchParams();

  if (config.basePath !== '') {
    params.append(BASE_PATH_PARAM, config.basePath);
  }

  params.append(CLASSIFY_BY_PARAM, config.classifyBy);
  if (config.classifyBy === ClassifyType.Category && config.categories.length > 1) {
    params.append(CATEGORIES_PARAM, config.categories.join(','));
  } else {
    params.append(KEY_PARAM, config.key);
    if (config.classifyBy === ClassifyType.Category && config.subcategories.length > 0) {
      params.append(SUBCATEGORIES_PARAM, config.subcategories.join(','));
    }
  }

  params.append(DISPLAY_HEADER_PARAM, String(config.displayHeader));
  params.append(DISPLAY_HEADER_CATEGORY_PARAM, String(config.displayCategoryTitle));
  params.append(DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM, String(config.displayCategoryInSubcategory));
  params.append(UPPERCASE_TITLE_PARAM, String(config.uppercaseTitle));
  params.append(TITLE_ALIGNMENT_PARAM, config.titleAlignment);
  params.append(TITLE_FONT_FAMILY_PARAM, config.titleFontFamily);
  params.append(TITLE_SIZE_PARAM, String(config.titleSize));
  params.append(ITEMS_STYLE_PARAM, config.itemsStyle);
  params.append(TITLE_BGCOLOR_PARAM, config.titleBgColor);
  params.append(TITLE_FGCOLOR_PARAM, config.titleFgColor);
  params.append(DISPLAY_ITEM_MODAL_PARAM, String(config.displayItemModal));
  params.append(HIDE_ORGANIZATION_SECTION_PARAM, String(config.displayItemModal && config.hideOrganizationSection));

  if (config.itemsStyle !== Style.Card) {
    params.append(DISPLAY_ITEM_NAME_PARAM, String(config.displayItemName));
    params.append(ITEMS_SIZE_PARAM, config.itemsSize);
    params.append(ITEMS_ALIGNMENT_PARAM, config.itemsAlignment);
    if (config.displayItemName) {
      params.append(ITEM_NAME_SIZE_PARAM, String(config.itemNameSize));
    }
    if (config.itemsSpacing !== undefined) {
      params.append(ITEMS_SPACING_PARAM, String(config.itemsSpacing));
    }
  }

  return `${embedBaseUrl}?${params.toString()}`;
};
