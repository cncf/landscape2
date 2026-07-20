// Share availability checks between the desktop and mobile dropdown instances.
const availabilityRequests = new Map<string, Promise<boolean>>();
const MISSING_STATUS_CODES = new Set([404, 410]);

/**
 * Check and cache whether a downloadable document exists without fetching its contents.
 */
const isDownloadAvailable = (url: string): Promise<boolean> => {
  const cachedRequest = availabilityRequests.get(url);
  if (cachedRequest) {
    return cachedRequest;
  }

  const request = fetch(url, { method: 'head' })
    .then((response) => {
      if (response.ok) {
        return true;
      }
      if (MISSING_STATUS_CODES.has(response.status)) {
        return false;
      }
      throw new Error(`Unable to check document availability: ${response.status}`);
    })
    .catch((error: unknown) => {
      // Allow a later check to retry after a transient request failure.
      availabilityRequests.delete(url);
      throw error;
    });
  availabilityRequests.set(url, request);

  return request;
};

export default isDownloadAvailable;
