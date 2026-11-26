import { describe, expect, it } from 'vitest';

import { escapeHtml } from '../escapeHtml';

describe('escapeHtml', () => {
  it.each([
    ['an ampersand', 'a & b', 'a &amp; b'],
    ['a less-than sign', 'a < b', 'a &lt; b'],
    ['a greater-than sign', 'a > b', 'a &gt; b'],
    ['a double quote', 'say "hi"', 'say &quot;hi&quot;'],
    ['a single quote', "it's", 'it&#39;s'],
    [
      'all five characters together',
      `<a href="x" title='y'>&</a>`,
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    ],
    ['an already escaped entity again', '&amp;', '&amp;amp;'],
    ['text without special characters unchanged', 'plain text', 'plain text'],
  ])('escapes %s', (_, value, expected) => {
    expect(escapeHtml(value)).toBe(expected);
  });
});
