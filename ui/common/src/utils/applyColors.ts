import type { LandscapeColors } from '../types/generated';

/** Sets the landscape colors as the `--color1` to `--color7` custom properties of the document root. */
export const applyColors = (colors: LandscapeColors): void => {
  const root = document.documentElement;
  root.style.setProperty('--color1', colors.color1);
  root.style.setProperty('--color2', colors.color2);
  root.style.setProperty('--color3', colors.color3);
  root.style.setProperty('--color4', colors.color4);
  root.style.setProperty('--color5', colors.color5);
  root.style.setProperty('--color6', colors.color6);
  root.style.setProperty('--color7', colors.color7);
};
