const isWasmSupported = (): boolean => {
  if (typeof WebAssembly !== 'undefined') {
    // WebAssembly is supported
    return true;
  } else {
    // WebAssembly is not supported
    return false;
  }
};

export default isWasmSupported;
