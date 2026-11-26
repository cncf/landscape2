import { describe, expect, it } from 'vitest';

import sortMenuOptions from '../sortMenuOptions';

describe('sortMenuOptions', () => {
  it.each([
    ['plain titles alphabetically', ['sandbox', 'graduated', 'incubating'], ['graduated', 'incubating', 'sandbox']],
    ['archived to the end', ['sandbox', 'archived', 'graduated'], ['graduated', 'sandbox', 'archived']],
    ['undefined to the end', ['undefined', 'sandbox', 'graduated'], ['graduated', 'sandbox', 'undefined']],
    [
      'archived and then undefined to the end',
      ['undefined', 'sandbox', 'archived', 'graduated'],
      ['graduated', 'sandbox', 'archived', 'undefined'],
    ],
    ['no titles', [], []],
  ])('sorts %s', (_, titles, expected) => {
    expect(sortMenuOptions(titles)).toEqual(expected);
  });

  it('leaves its input unchanged', () => {
    const titles = ['undefined', 'sandbox', 'archived', 'graduated'];

    sortMenuOptions(titles);

    expect(titles).toEqual(['undefined', 'sandbox', 'archived', 'graduated']);
  });
});
