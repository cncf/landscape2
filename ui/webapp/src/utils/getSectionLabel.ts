import { formatTAGName } from 'common';

/** Name of the section holding the items without a maturity or TAG. */
const UNDEFINED_SECTION = 'undefined';

/**
 * Returns the label of a Card view section classified by maturity or TAG.
 *
 * @param name - Section name: a maturity, a TAG, or `undefined` for the items without one
 * @param isTAG - Whether the section is a TAG, whose name is formatted as a title
 * @returns `None` for the items without a value, the formatted TAG name, or the name as it is
 */
const getSectionLabel = (name: string, isTAG: boolean = false): string => {
  if (name === UNDEFINED_SECTION) return 'None';
  return isTAG ? formatTAGName(name) : name;
};

export default getSectionLabel;
