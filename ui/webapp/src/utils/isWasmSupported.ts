/** Checks whether the browser supports WebAssembly. */
const isWasmSupported = (): boolean => typeof WebAssembly !== 'undefined';

export default isWasmSupported;
