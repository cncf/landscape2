import { describe, expect, it, vi } from 'vitest';

import getDevOrigin from '../getDevOrigin';

// The stubbed env vars are restored after each test (`unstubEnvs` in vitest.config.ts)
describe('getDevOrigin', () => {
  it('returns the local serve origin in development mode', () => {
    vi.stubEnv('MODE', 'development');

    expect(getDevOrigin('https://landscape.example.org')).toBe('http://localhost:8000');
  });

  it.each(['production', 'test'])('returns the fallback in %s mode', (mode) => {
    vi.stubEnv('MODE', mode);

    expect(getDevOrigin('https://landscape.example.org')).toBe('https://landscape.example.org');
  });
});
