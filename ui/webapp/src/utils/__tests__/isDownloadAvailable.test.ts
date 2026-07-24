import isDownloadAvailable from '../isDownloadAvailable';

const fetchMock = jest.fn();

describe('isDownloadAvailable', () => {
  beforeAll(() => {
    global.fetch = fetchMock;
  });

  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('should report an existing document as available', async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/pdf' }),
      ok: true,
    });

    await expect(isDownloadAvailable('./docs/landscape.pdf')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('./docs/landscape.pdf', {
      method: 'head',
    });
  });

  it('should report a missing document as unavailable', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(isDownloadAvailable('./docs/landscape.png')).resolves.toBe(false);
  });

  it('should report an HTML fallback response as unavailable', async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'Text/HTML; charset=utf-8' }),
      ok: true,
    });

    await expect(isDownloadAvailable('./docs/html-fallback.pdf')).resolves.toBe(false);
  });

  it('should allow an unexpected HTTP failure to be retried', async () => {
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

    await expect(isDownloadAvailable('./docs/retry-http.pdf')).rejects.toThrow(
      'Unable to check document availability: 503'
    );
    await expect(isDownloadAvailable('./docs/retry-http.pdf')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should reuse the availability request for the same document', async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/octet-stream' }),
      ok: true,
    });

    await Promise.all([isDownloadAvailable('./docs/items.csv'), isDownloadAvailable('./docs/items.csv')]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should allow a failed availability request to be retried', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network error')).mockResolvedValueOnce({
      headers: new Headers({ 'content-type': 'application/pdf' }),
      ok: true,
    });

    await expect(isDownloadAvailable('./docs/retry.pdf')).rejects.toThrow('Network error');
    await expect(isDownloadAvailable('./docs/retry.pdf')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
