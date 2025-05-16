const prettifyBytes = (bytes: number, decimals = 2): string => {
  if (bytes <= 0) return '0B';
  const k = 1024;
  const dm = decimals || 2;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))}${sizes[i]}`;
};

export default prettifyBytes;
