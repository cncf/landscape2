const EMOJI_REGEX = /:.*?:/g;

const cleanEmojis = (text: string): string => {
  return text.replace(EMOJI_REGEX, '');
};

export default cleanEmojis;
