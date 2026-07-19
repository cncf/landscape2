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
      signal: undefined,
    });
  });

  it('should report a missing document as unavailable', async () => {
    fetchMock.mockResolvedValue({ ok: false });

    await expect(isDownloadAvailable('./docs/landscape.pdf')).resolves.toBe(false);
  });
});
