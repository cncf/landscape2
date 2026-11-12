// Embed contract shared by the embed views, embed-item and the webapp embed
// setup, exported as `common/embed`.

export { buildEmbedUrl } from './buildEmbedUrl';
export { isSafeHref } from './isSafeHref';
export { isValidBasePath, parseBasePath } from './isValidBasePath';
export type { EmbedKeySelection } from './keys';
export { ALL_OPTIONS_EMBED_KEY, buildEmbedKey, buildMultiCategoryKey } from './keys';
export type { ShowItemDetails, ShowItemDetailsInput } from './messages';
export {
  buildShowItemDetailsMessage,
  HIDE_ITEM_DETAILS_MESSAGE_TYPE,
  parseShowItemDetailsMessage,
  SHOW_ITEM_DETAILS_MESSAGE_TYPE,
} from './messages';
export * from './params';
export type { EmbedConfig } from './parseEmbedConfig';
export { parseEmbedConfig } from './parseEmbedConfig';
