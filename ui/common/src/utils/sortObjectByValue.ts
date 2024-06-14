export const sortObjectByValue = (data: { [key: string]: number }, order: string = 'desc'): string[] => {
  return Object.keys(data).sort((a: string, b: string) => {
    if (order === 'desc') {
      return data[b] - data[a];
    } else {
      return data[a] - data[b];
    }
  });
};
