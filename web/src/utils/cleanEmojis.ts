const cleanEmojis = (text: string): string => {
  return text.replace(/:.*?:/g, '');
};

export default cleanEmojis;
