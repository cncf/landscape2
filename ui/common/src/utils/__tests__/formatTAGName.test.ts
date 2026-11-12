import { describe, expect, it } from 'vitest';

import { formatTAGName } from '../formatTAGName';

describe('formatTAGName', () => {
  it.each([
    ['app-delivery', 'App Delivery'],
    ['observability', 'Observability'],
    ['contributor-strategy-and-advocacy', 'Contributor Strategy And Advocacy'],
  ])('formats %s as %s', (tag, expected) => {
    expect(formatTAGName(tag)).toBe(expected);
  });
});
