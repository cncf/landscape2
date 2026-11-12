/**
 * Props the embed styled components only use to compute their styles. They
 * are not forwarded to the DOM (see the styled components setup in
 * `index.tsx`), so they never show up as attributes.
 */
export const EMBED_STYLE_PROPS: ReadonlySet<string> = new Set([
  'alignment',
  'borderless',
  'firstTitle',
  'fontFamily',
  'isBgTransparent',
  'itemNameSize',
  'paddingBottom',
  'size',
  'spacing',
  'uppercase',
  'withShadow',
]);
