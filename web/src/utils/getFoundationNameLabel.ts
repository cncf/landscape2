const getFoundationNameLabel = (): string => {
  const FOUNDATION: string = window.baseDS.foundation;
  return FOUNDATION.toLowerCase().replace(/ /g, '');
};

export default getFoundationNameLabel;
