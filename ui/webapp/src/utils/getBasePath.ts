const getBasePath = () => {
  return window.baseDS ? window.baseDS.base_path || '' : '';
};

export default getBasePath;
