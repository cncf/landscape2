const REGEX_1 = /[^\w\s-]/g;
const REGEX_2 = /[\s_-]+/g;
const REGEX_3 = /^-+|-+$/g;

const slugify = (text: string): string => {
  return text.toLowerCase().trim().replace(REGEX_1, '').replace(REGEX_2, '-').replace(REGEX_3, '');
};

export default slugify;
