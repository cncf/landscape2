import { COLORS } from '../data';

const generateColorsArray = (length: number): string[] => {
  return Array(Math.ceil(length / COLORS.length))
    .fill(COLORS)
    .flat();
};

export default generateColorsArray;
