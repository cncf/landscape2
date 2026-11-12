import { Group } from '../types';

/** Returns the name of the group with the normalized name given, `undefined` when it is unknown. */
const getGroupName = (group?: string): string | undefined =>
  window.baseDS.groups?.find((g: Group) => g.normalized_name === group)?.name;

export default getGroupName;
