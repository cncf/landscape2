import getDownloadBlob from '../getDownloadBlob';

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
      headers: new Headers({ 'content-type': 'application/pdf' }),
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

  it('should convert a text response to a blob with the requested type', async () => {
    const textMock = jest.fn().mockResolvedValue('name,category\nProject,Database');
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'text/csv; charset=utf-8' }),
      ok: true,
      text: textMock,
    });

    const result = await getDownloadBlob({
      blobType: 'text/csv',
      contentType: 'text/csv;charset=UTF-8',
      responseAsBlob: false,
      url: './docs/items.csv',
    });

    const reader = new FileReader();
    const resultText = new Promise<string>((resolve, reject) => {
      reader.addEventListener('load', () => resolve(reader.result as string), { once: true });
      reader.addEventListener('error', () => reject(reader.error), { once: true });
    });
    reader.readAsText(result);

    expect(textMock).toHaveBeenCalledTimes(1);
    expect(result.type).toBe('text/csv');
    await expect(resultText).resolves.toBe('name,category\nProject,Database');
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

  it('should reject a successful HTML fallback response', async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'Text/HTML; charset=utf-8' }),
      ok: true,
    });

    await expect(
      getDownloadBlob({
        blobType: 'application/pdf',
        contentType: 'application/pdf',
        responseAsBlob: true,
        url: './docs/html-fallback.pdf',
      })
    ).rejects.toThrow('Unable to download document: unexpected HTML response');
  });

  it('should preserve the HTTP error for an HTML error response', async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      ok: false,
      status: 503,
    });

    await expect(
      getDownloadBlob({
        blobType: 'application/pdf',
        contentType: 'application/pdf',
        responseAsBlob: true,
        url: './docs/unavailable.pdf',
      })
    ).rejects.toThrow('Unable to download document: 503');
  });
});
