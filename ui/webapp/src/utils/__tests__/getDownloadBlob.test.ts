import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

describe('getDownloadBlob', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('requests the document with a GET that accepts its content type', async () => {
    // Setup a PDF response
    const getDownloadBlob = await loadGetDownloadBlob();
    fetchMock.mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(['document'])),
      headers: new Headers({ 'content-type': 'application/pdf' }),
      ok: true,
    });

    // Download the PDF document
    await getDownloadBlob({
      accept: 'application/pdf',
      blobType: 'application/pdf',
      responseAsBlob: true,
      url: './docs/landscape.pdf',
    });

    // Check the request method and headers
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('./docs/landscape.pdf');
    expect(init.method).toBe('get');
    expect(new Headers(init.headers).get('accept')).toBe('application/pdf');
    expect(new Headers(init.headers).has('content-type')).toBe(false);
  });

  it('returns a binary response as the downloaded blob', async () => {
    // Setup a binary PDF response
    const getDownloadBlob = await loadGetDownloadBlob();
    const expectedBlob = new Blob(['document'], { type: 'application/pdf' });
    fetchMock.mockResolvedValue({
      blob: vi.fn().mockResolvedValue(expectedBlob),
      headers: new Headers({ 'content-type': 'application/pdf' }),
      ok: true,
    });

    // Download it as a blob
    const result = await getDownloadBlob({
      accept: 'application/pdf',
      blobType: 'application/pdf',
      responseAsBlob: true,
      url: './docs/landscape.pdf',
    });

    // Check the response blob is returned as is
    expect(result).toBe(expectedBlob);
  });

  it('converts a text response to a blob of the requested type', async () => {
    // Setup a CSV response read as text
    const getDownloadBlob = await loadGetDownloadBlob();
    const textMock = vi.fn().mockResolvedValue('name,category\nProject,Database');
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'text/csv; charset=utf-8' }),
      ok: true,
      text: textMock,
    });

    // Download it as a blob
    const result = await getDownloadBlob({
      accept: 'text/csv;charset=UTF-8',
      blobType: 'text/csv',
      responseAsBlob: false,
      url: './docs/items.csv',
    });

    // Check the blob type and content
    expect(textMock).toHaveBeenCalledTimes(1);
    expect(result.type).toBe('text/csv');
    await expect(readBlobText(result)).resolves.toBe('name,category\nProject,Database');
  });

  it.each([
    ['the document does not exist', 404],
    ['the document is gone', 410],
    ['the server fails, even with an HTML error page', 503],
  ])('rejects with the HTTP status when %s', async (_, status) => {
    // Setup an error response with an HTML body
    const getDownloadBlob = await loadGetDownloadBlob();
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      ok: false,
      status,
    });

    // Check the download rejects with the status
    await expect(
      getDownloadBlob({
        accept: 'application/pdf',
        blobType: 'application/pdf',
        responseAsBlob: true,
        url: './docs/landscape.pdf',
      })
    ).rejects.toThrow(`Unable to download document: ${status}`);
  });

  it('rejects a successful HTML fallback response', async () => {
    // Setup a successful HTML response, like a SPA fallback page
    const getDownloadBlob = await loadGetDownloadBlob();
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'Text/HTML; charset=utf-8' }),
      ok: true,
    });

    // Check the download rejects the HTML body
    await expect(
      getDownloadBlob({
        accept: 'application/pdf',
        blobType: 'application/pdf',
        responseAsBlob: true,
        url: './docs/html-fallback.pdf',
      })
    ).rejects.toThrow('Unable to download document: unexpected HTML response');
  });
});

// Helpers.

/** Imports a fresh copy of the module, so no state leaks between tests. */
const loadGetDownloadBlob = async () => {
  vi.resetModules();
  return (await import('../getDownloadBlob')).default;
};

/** Reads the content of a blob as text. */
const readBlobText = (blob: Blob): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string), { once: true });
    reader.addEventListener('error', () => reject(reader.error), { once: true });
    reader.readAsText(blob);
  });
