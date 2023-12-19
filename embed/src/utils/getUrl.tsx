const getUrl = (): string => {
  const url = new URL(document.location.href);
  return url.origin;
};

export default getUrl;
