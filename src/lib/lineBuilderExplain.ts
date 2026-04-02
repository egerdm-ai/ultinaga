import type { ScoreContext } from "@/lib/scoring";
import { scoreLineComposite } from "@/lib/scoring";
import { warningsForLine } from "@/lib/lineWarnings";
import type { TeamRules } from "@/types/models";

export function whyLineSummary(
  lineIds: string[],
  ctx: ScoreContext,
  teamRules: TeamRules,
): { good: string[]; risky: string[] } {
  if (lineIds.length !== 7) {
    return { good: [], risky: ["Need 7 players for a full assessment."] };
  }
  const b = scoreLineComposite(lineIds, ctx);
  const good: string[] = [];
  const risky: string[] = [];
  if (b.total >= 0.52) good.push("Solid composite quality for this context.");
  if (b.odFit >= 0.72) good.push("Good O/D lean fit.");
  if (b.chemistry > 0.85) good.push("Chemistry trio (Ege–Yeşim–Alp) possible.");
  if (b.handlerStability >= 0.65) good.push("Handler core looks stable.");
  if (b.total < 0.38) risky.push("Overall line quality is light for the mode.");
  if (b.overplayPenalty > 0.35) risky.push("Several high-usage or capped players.");
  risky.push(...warningsForLine(lineIds, ctx, teamRules));
  return { good: good.slice(0, 4), risky: [...new Set(risky)].slice(0, 5) };
}
