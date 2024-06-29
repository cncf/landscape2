const EMOJI_REGEX = /:.*?:/g;

export const cleanEmojis = (text: string): string => {
  return text.replace(EMOJI_REGEX, '');
};
