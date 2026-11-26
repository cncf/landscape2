import { escapeHtml } from './escapeHtml';

const LINE_BREAKS = /\r\n|\r|\n/g;
// Tag-like sequences are stripped to keep the text readable; this is not a security boundary, escaping is
const TAG_LIKE = /<\/?[a-z][^>]*>/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;
const URL_WITH_HOST = /^https?:\/\/[^/]/i;

/** Formats a summary text as HTML: tags removed, text escaped, `http(s)` URLs linked and line breaks kept. */
export const formatSummaryField = (text: string): string => {
  const plainText = text.replace(TAG_LIKE, '');
  let html = '';
  let lastIndex = 0;

  for (const match of plainText.matchAll(URL_PATTERN)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, '');
    if (!URL_WITH_HOST.test(url)) continue;

    html += escapeHtml(plainText.slice(lastIndex, match.index)) + formatLink(url);
    lastIndex = match.index + url.length;
  }
  html += escapeHtml(plainText.slice(lastIndex));

  return html.replace(LINE_BREAKS, '<br>');
};

/** Builds the anchor for a URL, escaping it in both the `href` and the text. */
const formatLink = (url: string): string => {
  const escapedUrl = escapeHtml(url);
  return `<a href="${escapedUrl}" class="text-decoration-underline" target="_blank" rel="noopener noreferrer">${escapedUrl}</a>`;
};
