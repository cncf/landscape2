import { REGEX_SPACE } from 'common';

/** Builds the foundation label used in maturity filter values: lowercase, without spaces. */
const getFoundationNameLabel = (foundation: string): string => foundation.toLowerCase().replace(REGEX_SPACE, '');

export default getFoundationNameLabel;
