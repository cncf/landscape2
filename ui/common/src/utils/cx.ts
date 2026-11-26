/** Joins the truthy class names provided, skipping `false`, `null`, `undefined` and empty values. */
export const cx = (...classes: (string | false | null | undefined)[]): string => classes.filter(Boolean).join(' ');
