import { ClassifyType } from './params';

/** Type of the message an embed sends to show the details of an item. */
export const SHOW_ITEM_DETAILS_MESSAGE_TYPE = 'showItemDetails';

/** Type of the message embed-item sends when its item details are closed. */
export const HIDE_ITEM_DETAILS_MESSAGE_TYPE = 'hideItemDetails';

// Characters `normalize_name` can emit (letters and numbers in any script, `+`, `_` and `-`, plus
// the combining dot U+0307: the Turkish capital `İ` lowercases to `i` followed by it)
const KEY = /^[\p{L}\p{N}\u0307+_-]+$/u;

const CLASSIFY_TYPES = new Set<string>(Object.values(ClassifyType));

/** Message an embed sends (through the host page) to show an item in embed-item. */
export interface ShowItemDetails {
  classifyBy: ClassifyType;
  foundation: string;
  itemId: string;
  key: string;
  type: typeof SHOW_ITEM_DETAILS_MESSAGE_TYPE;
  categories?: string[];
  hideOrganizationSection?: boolean;
}

/** Fields of the show item details message. */
export type ShowItemDetailsInput = Omit<ShowItemDetails, 'type'>;

/**
 * Builds the message an embed sends to show the details of an item, leaving
 * out the optional fields that are not set.
 *
 * @param input - Item and embed view the details belong to
 * @returns Message accepted by `parseShowItemDetailsMessage`
 */
export const buildShowItemDetailsMessage = (input: ShowItemDetailsInput): ShowItemDetails => ({
  classifyBy: input.classifyBy,
  foundation: input.foundation,
  itemId: input.itemId,
  key: input.key,
  type: SHOW_ITEM_DETAILS_MESSAGE_TYPE,
  ...(input.categories !== undefined && { categories: input.categories }),
  ...(input.hideOrganizationSection !== undefined && { hideOrganizationSection: input.hideOrganizationSection }),
});

/**
 * Validates a message received by embed-item and returns its known fields.
 *
 * @param data - Data of the received message
 * @returns The show item details message, or `null` when the data is not a valid one
 */
export const parseShowItemDetailsMessage = (data: unknown): ShowItemDetails | null => {
  if (typeof data !== 'object' || data === null) return null;

  const message = data as Record<string, unknown>;
  const { categories, classifyBy, foundation, hideOrganizationSection, itemId, key } = message;
  if (message.type !== SHOW_ITEM_DETAILS_MESSAGE_TYPE) return null;
  if (typeof itemId !== 'string' || itemId === '') return null;
  if (typeof classifyBy !== 'string' || !CLASSIFY_TYPES.has(classifyBy)) return null;
  if (!isKey(key)) return null;
  if (typeof foundation !== 'string') return null;
  if (categories !== undefined && !isKeyList(categories)) return null;
  if (hideOrganizationSection !== undefined && typeof hideOrganizationSection !== 'boolean') return null;

  return buildShowItemDetailsMessage({
    categories,
    classifyBy: classifyBy as ClassifyType,
    foundation,
    hideOrganizationSection,
    itemId,
    key,
  });
};

const isKey = (value: unknown): value is string => typeof value === 'string' && KEY.test(value);

const isKeyList = (value: unknown): value is string[] => Array.isArray(value) && value.every(isKey);
