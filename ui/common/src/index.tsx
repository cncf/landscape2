// Components
export { CodeBlock } from './components/CodeBlock';
export { ExternalLink } from './components/ExternalLink';
export { FoundationBadge } from './components/FoundationBadge';
export { Image } from './components/Image';
export { ItemModalContent } from './components/itemModal/ItemModalContent';
export { ItemModalMobileContent } from './components/itemModal/ItemModalMobileContent';
export { Loading } from './components/Loading';
export { MaturityBadge } from './components/MaturityBadge';
export { Modal } from './components/Modal';
export { NoData } from './components/NoData';
export { SVGIcon } from './components/SVGIcon';

// Utils
export {
  capitalizeFirstLetter,
  cutString,
  formatMonthYear,
  formatProfitLabel,
  formatTAGName,
  getMainTag,
  joinFullDataset,
  parseLocalDate,
  parseYearMonth,
  prettifyNumber,
  sortObjectByValue,
  subtractMonths,
  subtractWeeks,
} from './utils';

// Data
export {
  BANNER_ID,
  DEFAULT_ITEM_DESCRIPTION,
  REGEX_DASH,
  REGEX_SPACE,
  REGEX_UNDERSCORE,
  REGEX_URL,
  SMALL_DEVICES_BREAKPOINTS,
} from './data/data';

// Embed
export * from './embed';

// Hooks
export { useBodyScroll, useBreakpointDetect, useModalFocus, useOutsideClick } from './hooks';

// Types
export * from './types/datasets';
// The enum objects (and their merged types) shadow the generated unions of the same name
export { GridItemsSize, ViewMode } from './types/datasets';
export type * from './types/generated';
export { Breakpoint, SVGIconKind } from './types/types';
