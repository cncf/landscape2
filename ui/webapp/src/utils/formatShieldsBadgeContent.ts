import { REGEX_DASH } from '../data';

// `badgeContent` message needs double dash instead of single dash,
// due to single dash being used as a separator by shields.io
// https://shields.io/badges/static-badge
const formatShieldsBadgeContent = (n: string): string => {
  return n.replace(REGEX_DASH, '--');
};

export default formatShieldsBadgeContent;
