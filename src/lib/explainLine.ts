import type { Player } from "@/types/models";
import { rosterById } from "@/lib/playerStats";
import type { ScoredLine } from "@/lib/recommendationEngine";

export function lineNames(line: ScoredLine | null, roster: Player[]): string {
  if (!line) return "—";
  const map = rosterById(roster);
  return line.playerIds
    .map((id) => map.get(id)?.name ?? id)
    .join(", ");
}

export function explainBullets(
  line: ScoredLine | null,
  _roster: Player[],
): string[] {
  if (!line) return ["No legal line found for current eligibility and rules."];
  const b = line.breakdown;
  const out: string[] = [];
  if (b.handlerStability > 0.65) out.push("Strong handler stability.");
  else if (b.handlerStability < 0.35) out.push("Handler stability is a concern.");
  if (b.minTarget > 0.45) out.push("Good coverage for minimum point targets.");
  if (b.chemistry > 0.85) out.push("Chemistry trio bonus (Ege + Yeşim + Alp).");
  if (b.ramNajaPenalty > 0.35) out.push("Ram + Naja handler pairing cost applied.");
  if (b.overplayPenalty > 0.25) out.push("Some players are high-usage or near soft cap.");
  if (b.genderFit > 0.75) out.push("Fits 4F handler / male cutter preferences.");
  if (out.length === 0) out.push("Balanced line by composite score.");
  return out;
}
