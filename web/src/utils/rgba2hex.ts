const REGEX_RGBA = /^rgba?\(|\s+|\)$/g;

const rgba2hex = (rgba: string): string => {
  return (
    '#' +
    rgba
      .replace(REGEX_RGBA, '')
      .split(',')
      .filter((_string, index) => index !== 3)
      .map((string) => parseFloat(string))
      .map((number, index) => (index === 3 ? Math.round(number * 255) : number))
      .map((number) => number.toString(16))
      .map((string) => (string.length === 1 ? '0' + string : string))
      .join('')
  );
};

export default rgba2hex;
