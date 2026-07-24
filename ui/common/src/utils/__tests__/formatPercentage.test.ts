import { formatPercentage } from '../formatPercentage';

describe('formatPercentage', () => {
  it.each([
    [0, '0%'],
    [0.004, '<0.01%'],
    [0.01, '0.01%'],
    [1.234, '1.23%'],
    [12, '12%'],
  ])('should format %s as %s', (value, expectedValue) => {
    expect(formatPercentage(value)).toBe(expectedValue);
  });
});
