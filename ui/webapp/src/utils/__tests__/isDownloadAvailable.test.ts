import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

describe('isDownloadAvailable', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('reports an existing document as available, checked with a HEAD request', async () => {
    // Setup an existing PDF document
    const isDownloadAvailable = await loadIsDownloadAvailable();
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/pdf' }),
      ok: true,
    });

    // Check it is available and was checked with a HEAD request
    await expect(isDownloadAvailable('./docs/landscape.pdf')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('./docs/landscape.pdf', { method: 'head' });
  });

  it.each([
    ['not found', 404],
    ['gone', 410],
  ])('reports a document %s as missing', async (_, status) => {
    const isDownloadAvailable = await loadIsDownloadAvailable();
    fetchMock.mockResolvedValue({ ok: false, status });

    await expect(isDownloadAvailable('./docs/landscape.png')).resolves.toBe(false);
  });

  it('reports an HTML fallback response as missing', async () => {
    const isDownloadAvailable = await loadIsDownloadAvailable();
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'Text/HTML; charset=utf-8' }),
      ok: true,
    });

    await expect(isDownloadAvailable('./docs/landscape.pdf')).resolves.toBe(false);
  });

  it('reuses the availability request of the same document', async () => {
    // Setup an available document
    const isDownloadAvailable = await loadIsDownloadAvailable();
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/octet-stream' }),
      ok: true,
    });

    // Ask for the same document concurrently, then once more after both settle
    await Promise.all([isDownloadAvailable('./docs/items.csv'), isDownloadAvailable('./docs/items.csv')]);
    await isDownloadAvailable('./docs/items.csv');

    // Check only one request was sent
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries the check after an unexpected HTTP status', async () => {
    // Setup a failing response followed by a successful one
    const isDownloadAvailable = await loadIsDownloadAvailable();
    fetchMock
      .mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        ok: false,
        status: 503,
      })
      .mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/pdf' }),
        ok: true,
      });

    // Check the document twice
    await expect(isDownloadAvailable('./docs/landscape.pdf')).rejects.toThrow(
      'Unable to check document availability: 503'
    );
    await expect(isDownloadAvailable('./docs/landscape.pdf')).resolves.toBe(true);

    // Check the failed request was not cached
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries the check after a network failure', async () => {
    // Setup a network failure followed by a successful response
    const isDownloadAvailable = await loadIsDownloadAvailable();
    fetchMock.mockRejectedValueOnce(new TypeError('Network error')).mockResolvedValueOnce({
      headers: new Headers({ 'content-type': 'application/pdf' }),
      ok: true,
    });

    // Check the document twice
    await expect(isDownloadAvailable('./docs/landscape.pdf')).rejects.toThrow('Network error');
    await expect(isDownloadAvailable('./docs/landscape.pdf')).resolves.toBe(true);

    // Check the failed request was not cached
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// Helpers.

/** Imports a fresh copy of the module, so the availability cache doesn't leak between tests. */
const loadIsDownloadAvailable = async () => {
  vi.resetModules();
  return (await import('../isDownloadAvailable')).default;
};
