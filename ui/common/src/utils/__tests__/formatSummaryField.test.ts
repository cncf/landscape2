import { describe, expect, it } from 'vitest';

import { formatSummaryField } from '../formatSummaryField';

describe('formatSummaryField', () => {
  it.each([
    [
      'keeps a query string ampersand inside the link',
      'See https://example.com/?a=1&b=2 now',
      `See ${link('https://example.com/?a=1&amp;b=2')} now`,
    ],
    ['keeps a trailing period outside the link', 'Visit https://example.com.', `Visit ${link('https://example.com')}.`],
    [
      'keeps trailing punctuation and closing brackets outside the link',
      '(see https://example.com/a),',
      `(see ${link('https://example.com/a')}),`,
    ],
    ['links an uppercase host', 'https://Example.COM/path', link('https://Example.COM/path')],
    [
      'links a top-level domain longer than six characters',
      'https://cncf.foundation/x',
      link('https://cncf.foundation/x'),
    ],
    ['links an http URL', 'Old http://example.com site', `Old ${link('http://example.com')} site`],
    [
      'links every URL in the text',
      'https://a.io and https://b.io',
      `${link('https://a.io')} and ${link('https://b.io')}`,
    ],
    ['removes tags and keeps their text', '<img src=x onerror=alert(1)>hello', 'hello'],
    ['removes paired tags', '<b>bold</b> <script>x</script>', 'bold x'],
    ['escapes special characters in the text', 'a < b & c', 'a &lt; b &amp; c'],
    ['escapes quotes in the text', `"quoted" 'text'`, '&quot;quoted&quot; &#39;text&#39;'],
    ['does not link a javascript URL', 'javascript:alert(1)', 'javascript:alert(1)'],
    ['does not link a URL without host', 'Broken https://. link', 'Broken https://. link'],
    ['does not link a scheme glued to a word', 'xhttps://example.com', 'xhttps://example.com'],
    ['replaces a CRLF line break', 'a\r\nb', 'a<br>b'],
    ['replaces a CR line break', 'a\rb', 'a<br>b'],
    ['replaces an LF line break', 'a\nb', 'a<br>b'],
    ['replaces line breaks around a link', 'a\nhttps://example.com\nb', `a<br>${link('https://example.com')}<br>b`],
  ])('%s', (_, text, expected) => {
    expect(formatSummaryField(text)).toBe(expected);
  });

  it('links the whole URL with a query string ampersand and leaves no stray text', () => {
    // Render the formatted summary
    const container = document.createElement('div');
    container.innerHTML = formatSummaryField('See https://example.com/?a=1&b=2 now');

    // Check the link and the text around it
    const anchors = container.querySelectorAll('a');
    expect(anchors).toHaveLength(1);
    expect(anchors[0].getAttribute('href')).toBe('https://example.com/?a=1&b=2');
    expect(anchors[0].textContent).toBe('https://example.com/?a=1&b=2');
    expect(container.textContent).toBe('See https://example.com/?a=1&b=2 now');
    expect(container.textContent).not.toContain(';b=2');
  });

  it('opens links in a new tab without leaking the opener', () => {
    const container = document.createElement('div');
    container.innerHTML = formatSummaryField('https://example.com');

    const anchor = container.querySelector('a');
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    expect(anchor).toHaveClass('text-decoration-underline');
  });
});

/** Builds the anchor markup expected for an already escaped URL. */
const link = (escapedUrl: string): string =>
  `<a href="${escapedUrl}" class="text-decoration-underline" target="_blank" rel="noopener noreferrer">${escapedUrl}</a>`;
