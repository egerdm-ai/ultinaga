import type { GameMode, MatchPoint, Player } from "@/types/models";
import { getPlayedCount, getLastPlayedPoint, getPointsSinceLastPlayed } from "@/lib/playerStats";
import { estimateRemainingPoints } from "@/lib/estimateRemaining";

export function averageRestGap(playerId: string, points: MatchPoint[]): number {
  const nums: number[] = [];
  let last: number | null = null;
  const sorted = [...points].sort((a, b) => a.pointNumber - b.pointNumber);
  for (const p of sorted) {
    if (!p.players.includes(playerId)) continue;
    if (last !== null) nums.push(p.pointNumber - last);
    last = p.pointNumber;
  }
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function odCounts(points: MatchPoint[]): { O: number; D: number } {
  return points.reduce(
    (acc, p) => {
      acc[p.side]++;
      return acc;
    },
    { O: 0, D: 0 },
  );
}

export function genderPatternCounts(
  points: MatchPoint[],
): Record<string, number> {
  const m: Record<string, number> = { "4M3F": 0, "4F3M": 0 };
  for (const p of points) {
    m[p.genderPattern] = (m[p.genderPattern] ?? 0) + 1;
  }
  return m;
}

export type UsageBand =
  | "underplayed"
  | "balanced"
  | "high"
  | "overloaded";

export function usageBand(
  played: number,
  minTarget: number,
  softMax?: number,
): UsageBand {
  const s = softMax ?? 8;
  if (played >= s) return "overloaded";
  if (played >= s * 0.85) return "high";
  if (played < minTarget) return "underplayed";
  return "balanced";
}

export interface PlayerRowStats {
  player: Player;
  played: number;
  lastPoint: number | null;
  since: number;
  urgency: number;
  eligibleNext: boolean;
  usageBand: UsageBand;
}

export function buildPlayerRows(
  roster: Player[],
  points: MatchPoint[],
  currentPointNumber: number,
  lastPointIds: string[],
  scoreUs: number,
  scoreThem: number,
  mode: GameMode,
): PlayerRowStats[] {
  const last = new Set(lastPointIds);
  return roster.map((player) => {
    const played = getPlayedCount(player.id, points);
    const lastPt = getLastPlayedPoint(player.id, points);
    const since = getPointsSinceLastPlayed(player.id, points, currentPointNumber);
    const remaining = estimateRemainingPoints(scoreUs, scoreThem, mode);
    const need = Math.max(0, player.minTargetPoints - played);
    const urgency =
      need > 0 ? Math.min(1, need / Math.max(1, remaining)) : 0;
    return {
      player,
      played,
      lastPoint: lastPt,
      since,
      urgency,
      eligibleNext: !last.has(player.id),
      usageBand: usageBand(played, player.minTargetPoints, player.softMaxPoints),
    };
  });
}
