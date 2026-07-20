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
    fetchMock.mockResolvedValue({ ok: false });

    await expect(isDownloadAvailable('./docs/landscape.png')).resolves.toBe(false);
  });

  it('should reuse the availability request for the same document', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    await Promise.all([isDownloadAvailable('./docs/items.csv'), isDownloadAvailable('./docs/items.csv')]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
