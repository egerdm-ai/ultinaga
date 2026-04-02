/**
 * Replace players who are ineligible (last point) with fillers from candidate list.
 * Preserves order; uses first available filler not already used.
 */
export function replaceIneligibleInLine(
  lineIds: string[],
  lastPointIds: string[],
  eligibleIds: string[],
  fillerPriority: string[],
): string[] {
  const last = new Set(lastPointIds);
  const eligible = new Set(eligibleIds);
  const used = new Set<string>();
  const out: string[] = [];
  const fillers = [...fillerPriority];

  for (const id of lineIds) {
    const ok = eligible.has(id) && !last.has(id);
    if (ok) {
      out.push(id);
      used.add(id);
      continue;
    }
    const next = fillers.find(
      (c) => eligible.has(c) && !last.has(c) && !used.has(c),
    );
    if (next) {
      out.push(next);
      used.add(next);
    }
  }
  for (const id of fillers) {
    if (out.length >= 7) break;
    if (used.has(id)) continue;
    if (!eligible.has(id) || last.has(id)) continue;
    out.push(id);
    used.add(id);
  }
  return out.slice(0, 7);
}
