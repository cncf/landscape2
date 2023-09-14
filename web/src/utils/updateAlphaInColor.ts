const updateAlphaInColor = (color: string, a: number): string => {
  const match = /rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*\d+[.\d+]*)*\)/g.exec(color);
  const amount = a > 1 ? a / 100 : a;
  if (match) {
    return `rgba(${[match[1], match[2], match[3], amount].join(',')})`;
  } else {
    return color;
  }
};

export default updateAlphaInColor;
