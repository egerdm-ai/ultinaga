import type { MatchPoint, Player, TeamRules } from "@/types/models";
import type { ScoredLine } from "@/lib/recommendationEngine";

export interface CoachRequestPayload {
  opponent: string;
  scoreUs: number;
  scoreThem: number;
  mode: string;
  nextSide: string;
  nextGenderPattern: string;
  points: MatchPoint[];
  roster: Player[];
  teamRules: TeamRules;
  recommendations: {
    best: ScoredLine | null;
    rotationSafe: ScoredLine | null;
    mustPlayPressure: ScoredLine | null;
  };
}

export interface CoachResponsePayload {
  explanation: string;
  underplayedWarnings: string;
  coachingAdvice: string;
}

export async function fetchCoachInsight(
  payload: CoachRequestPayload,
): Promise<CoachResponsePayload> {
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Coach API error ${res.status}`);
  }
  return (await res.json()) as CoachResponsePayload;
}
