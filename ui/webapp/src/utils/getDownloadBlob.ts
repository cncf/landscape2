interface GetDownloadBlobOptions {
  blobType: string;
  contentType: string;
  responseAsBlob: boolean;
  url: string;
}

/**
 * Fetch a downloadable document and convert it to a blob.
 */
const getDownloadBlob = async ({
  blobType,
  contentType,
  responseAsBlob,
  url,
}: GetDownloadBlobOptions): Promise<Blob> => {
  const response = await fetch(url, {
    method: 'get',
    headers: {
      'content-type': contentType,
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to download document: ${response.status}`);
  }

  if (responseAsBlob) {
    return response.blob();
  }

  const data = await response.text();
  return new Blob([data], { type: blobType });
};

export default getDownloadBlob;
