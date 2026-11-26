const HTML_ENTITIES: Record<string, string> = {
  '"': '&quot;',
  '&': '&amp;',
  "'": '&#39;',
  '<': '&lt;',
  '>': '&gt;',
};
const HTML_SPECIAL_CHARACTERS = /["&'<>]/g;

/** Escapes the HTML special characters (`& < > " '`) so the value is safe as text or attribute content. */
export const escapeHtml = (value: string): string =>
  value.replace(HTML_SPECIAL_CHARACTERS, (character) => HTML_ENTITIES[character]);
