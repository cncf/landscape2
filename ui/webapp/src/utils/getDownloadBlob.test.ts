import getDownloadBlob from './getDownloadBlob';

const fetchMock = jest.fn();

describe('getDownloadBlob', () => {
  beforeAll(() => {
    global.fetch = fetchMock;
  });

  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('should return the downloaded response as a blob', async () => {
    const expectedBlob = new Blob(['document'], { type: 'application/pdf' });
    fetchMock.mockResolvedValue({
      blob: jest.fn().mockResolvedValue(expectedBlob),
      ok: true,
    });

    const result = await getDownloadBlob({
      blobType: 'application/pdf',
      contentType: 'application/pdf',
      responseAsBlob: true,
      url: './docs/landscape.pdf',
    });

    expect(result).toBe(expectedBlob);
  });

  it('should reject when the document does not exist', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(
      getDownloadBlob({
        blobType: 'application/pdf',
        contentType: 'application/pdf',
        responseAsBlob: true,
        url: './docs/landscape.pdf',
      })
    ).rejects.toThrow('Unable to download document: 404');
  });
});
