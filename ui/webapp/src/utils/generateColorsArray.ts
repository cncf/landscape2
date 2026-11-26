import { COLORS } from '../data';

/** Repeats the category colors until there are at least as many as the length given. */
const generateColorsArray = (length: number): string[] =>
  Array(Math.ceil(length / COLORS.length))
    .fill(COLORS)
    .flat();

export default generateColorsArray;
