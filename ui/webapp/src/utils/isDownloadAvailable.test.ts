import isDownloadAvailable from './isDownloadAvailable';

const fetchMock = jest.fn();

describe('isDownloadAvailable', () => {
  beforeAll(() => {
    global.fetch = fetchMock;
  });

  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('should report an existing document as available', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    await expect(isDownloadAvailable('./docs/landscape.pdf')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('./docs/landscape.pdf', {
      method: 'head',
    });
  });

  it('should report a missing document as unavailable', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(isDownloadAvailable('./docs/landscape.png')).resolves.toBe(false);
  });

  it('should allow an unexpected HTTP failure to be retried', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValueOnce({ ok: true });

    await expect(isDownloadAvailable('./docs/retry-http.pdf')).rejects.toThrow(
      'Unable to check document availability: 503'
    );
    await expect(isDownloadAvailable('./docs/retry-http.pdf')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should reuse the availability request for the same document', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    await Promise.all([isDownloadAvailable('./docs/items.csv'), isDownloadAvailable('./docs/items.csv')]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should allow a failed availability request to be retried', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network error')).mockResolvedValueOnce({ ok: true });

    await expect(isDownloadAvailable('./docs/retry.pdf')).rejects.toThrow('Network error');
    await expect(isDownloadAvailable('./docs/retry.pdf')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
