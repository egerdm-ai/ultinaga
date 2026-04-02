/** All k-sized combinations of arr (input order preserved). */
export function combinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  const n = arr.length;
  if (k < 0 || k > n) return [];
  if (k === 0) return [[]];
  const combo: T[] = [];
  function dfs(start: number) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < n; i++) {
      combo.push(arr[i]!);
      dfs(i + 1);
      combo.pop();
    }
  }
  dfs(0);
  return result;
}
