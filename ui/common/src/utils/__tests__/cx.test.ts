import { describe, expect, it } from 'vitest';

import { cx } from '../cx';

type ClassValue = string | false | null | undefined;

describe('cx', () => {
  it.each<[string, ClassValue[], string]>([
    ['joins every class name', ['a', 'b c', 'd'], 'a b c d'],
    ['skips undefined', ['a', undefined, 'b'], 'a b'],
    ['skips null', ['a', null, 'b'], 'a b'],
    ['skips false', ['a', false, 'b'], 'a b'],
    ['skips empty strings', ['a', '', 'b'], 'a b'],
    ['returns an empty string without truthy class names', [undefined, null, false, ''], ''],
    ['returns an empty string without arguments', [], ''],
  ])('%s', (_, classes, expected) => {
    expect(cx(...classes)).toBe(expected);
  });

  it('keeps the class name of a conditional when it is true', () => {
    const active = true;
    expect(cx('item', active && 'active')).toBe('item active');
  });
});
