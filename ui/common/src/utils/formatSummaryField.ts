import sanitizeHtml from 'sanitize-html';

// eslint-disable-next-line
const urlRegex = /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
const LINE_BREAKS = /(?:\r\n|\r|\n)/g;

const replaceLineBreaks = (text: string): string => {
  if (text.match(LINE_BREAKS)) {
    return text.replace(LINE_BREAKS, '<br>');
  }
  return text;
};

const linkify = (text: string): string => {
  if (text.match(urlRegex)) {
    return text.replace(urlRegex, function (url) {
      return `<a href="${url}" class="text-decoration-underline" target=_blank rel="noopener noreferrer">${url}</a>`;
    });
  }
  return text;
};

export const formatSummaryField = (text: string): string => {
  return replaceLineBreaks(linkify(sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} })));
};
