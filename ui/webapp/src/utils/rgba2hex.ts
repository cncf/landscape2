const REGEX_RGBA = /^rgba?\(|\s+|\)$/g;

/** Converts an rgb or rgba color to its hex value, dropping the alpha channel. */
const rgba2hex = (rgba: string): string => {
  return (
    '#' +
    rgba
      .replace(REGEX_RGBA, '')
      .split(',')
      .filter((_string, index) => index !== 3)
      .map((string) => parseFloat(string))
      .map((number) => number.toString(16))
      .map((string) => (string.length === 1 ? '0' + string : string))
      .join('')
  );
};

export default rgba2hex;
