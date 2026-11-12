const DEFAULT_DECIMALS = 2;
const K = 1024;
const SIZES = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

/** Formats a size in bytes with a binary unit (`1.5KB`), rounded to the given decimals without trailing zeros. */
const prettifyBytes = (bytes: number, decimals: number = DEFAULT_DECIMALS): string => {
  if (bytes <= 0) return '0B';
  const unitIndex = Math.min(Math.max(Math.floor(Math.log(bytes) / Math.log(K)), 0), SIZES.length - 1);
  return `${Number.parseFloat((bytes / K ** unitIndex).toFixed(decimals))}${SIZES[unitIndex]}`;
};

export default prettifyBytes;
