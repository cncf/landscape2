/** Returns the keys of an object sorted by their numeric value (descending by default; ties keep their order). */
export const sortObjectByValue = (data: Record<string, number>, order: 'asc' | 'desc' = 'desc'): string[] =>
  Object.keys(data).sort((a, b) => (order === 'desc' ? data[b] - data[a] : data[a] - data[b]));
