/**
 * Check whether a downloadable document exists without fetching its contents.
 */
const isDownloadAvailable = async (url: string, signal?: AbortSignal): Promise<boolean> => {
  const response = await fetch(url, {
    method: 'head',
    signal,
  });

  return response.ok;
};

export default isDownloadAvailable;
