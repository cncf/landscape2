const checkQueryStringValue = (query: string, value: string): boolean => {
  const url = new URL(window.location.href);

  if (url.searchParams.has(query)) {
    return url.searchParams.get(query) === value;
  } else {
    return false;
  }
};

export default checkQueryStringValue;
