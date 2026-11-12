interface GetDownloadBlobOptions {
  /** Media type the request accepts. */
  accept: string;
  blobType: string;
  responseAsBlob: boolean;
  url: string;
}

/**
 * Fetch a downloadable document and convert it to a blob.
 */
const getDownloadBlob = async ({ accept, blobType, responseAsBlob, url }: GetDownloadBlobOptions): Promise<Blob> => {
  // A GET has no body, so it states the media type it accepts rather than a content type
  const response = await fetch(url, {
    method: 'get',
    headers: { accept },
  });

  if (!response.ok) {
    throw new Error(`Unable to download document: ${response.status}`);
  }

  // Some SPA hosts return index.html with 200 for missing document paths.
  if (response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
    throw new Error('Unable to download document: unexpected HTML response');
  }

  // Preserve binary responses while assigning the expected MIME type to text exports.
  if (responseAsBlob) {
    return response.blob();
  }

  const data = await response.text();
  return new Blob([data], { type: blobType });
};

export default getDownloadBlob;
