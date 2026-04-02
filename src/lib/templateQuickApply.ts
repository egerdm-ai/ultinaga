import type { GenderPattern, LineTemplate, PointSide } from "@/types/models";

/** First saved template that is fully playable with current eligibility. */
export function firstFullyEligibleTemplate(
  templates: LineTemplate[],
  side: PointSide,
  genderPattern: GenderPattern,
  eligibleIds: string[],
): string[] | null {
  const set = new Set(eligibleIds);
  const cands = templates.filter(
    (t) => t.side === side && t.genderPattern === genderPattern,
  );
  for (const t of cands) {
    if (t.players.length === 7 && t.players.every((id) => set.has(id))) {
      return [...t.players];
    }
  }
  return null;
}
