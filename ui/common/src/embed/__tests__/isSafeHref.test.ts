import { describe, expect, it } from 'vitest';

import { isSafeHref } from '../isSafeHref';

describe('isSafeHref', () => {
  it.each(['http://example.com', 'https://example.com/a?b=c#d', 'HTTPS://EXAMPLE.COM', 'mailto:info@example.com'])(
    'accepts %j',
    (value) => {
      expect(isSafeHref(value)).toBe(true);
    }
  );

  it.each([
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '/relative/path',
    'relative/path',
    '//example.com',
    '#anchor',
    '',
  ])('rejects %j', (value) => {
    expect(isSafeHref(value)).toBe(false);
  });
});
