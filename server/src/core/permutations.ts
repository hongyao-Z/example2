export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [Array.from(items)];

  const result: T[][] = [];
  for (let index = 0; index < items.length; index += 1) {
    const head = items[index];
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const tail of permutations(rest)) {
      result.push([head, ...tail]);
    }
  }

  return result;
}
