const sortMenuOptions = (titles: string[]): string[] => {
  const sorted = titles.sort();
  if (sorted.includes('archived')) {
    const index = sorted.indexOf('archived');
    sorted.splice(index, 1);
    sorted.push('archived');
  }

  if (sorted.includes('undefined')) {
    const index = sorted.indexOf('undefined');
    sorted.splice(index, 1);
    sorted.push('undefined');
  }
  return sorted;
};

export default sortMenuOptions;
