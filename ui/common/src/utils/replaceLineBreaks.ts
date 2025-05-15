const LINE_BREAKS = /(?:\r\n|\r|\n)/g;

export const replaceLineBreaks = (text: string): string => {
  if (text.match(LINE_BREAKS)) {
    return text.replace(LINE_BREAKS, '<br>');
  }

  return text;
};
