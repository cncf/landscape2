// Components
export { CodeBlock } from './components/CodeBlock';
export { ExternalLink } from './components/ExternalLink';
export { FoundationBadge } from './components/FoundationBadge';
export { Image } from './components/Image';
export { ItemModalContent } from './components/ItemModalContent';
export { ItemModalMobileContent } from './components/ItemModalMobileContent';
export { Loading } from './components/Loading';
export { MaturityBadge } from './components/MaturityBadge';
export { Modal } from './components/Modal';
export { NoData } from './components/NoData';
export { SVGIcon } from './components/SVGIcon';

// Utils
export {
  capitalizeFirstLetter,
  cutString,
  formatProfitLabel,
  formatTAGName,
  getItemDescription,
  prettifyNumber,
  sortObjectByValue,
} from './utils';

// Hooks
export { useBodyScroll, useBreakpointDetect, useOutsideClick } from './hooks';

// Types
export type { GithubRepository, Item, Organization, Repository } from './types/types';
export { SVGIconKind } from './types/types';
