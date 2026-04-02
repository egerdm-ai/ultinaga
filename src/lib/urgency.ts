import type { GameMode, Player, UrgencyStatus } from "@/types/models";
import type { MatchPoint } from "@/types/models";
import { getPlayedCount } from "@/lib/playerStats";
import { estimateRemainingPoints } from "@/lib/estimateRemaining";

export interface UrgencyContext {
  points: MatchPoint[];
  currentPointNumber: number;
  scoreUs: number;
  scoreThem: number;
  mode: GameMode;
}

export function computeMinTargetUrgency(
  player: Player,
  ctx: UrgencyContext,
): number {
  const played = getPlayedCount(player.id, ctx.points);
  const remaining = estimateRemainingPoints(
    ctx.scoreUs,
    ctx.scoreThem,
    ctx.mode,
  );
  const needed = Math.max(0, player.minTargetPoints - played);
  if (needed === 0) return 0;
  return Math.min(1, needed / Math.max(1, remaining));
}

export function urgencyStatus(u: number): UrgencyStatus {
  if (u >= 0.55) return "critical";
  if (u >= 0.28) return "watch";
  return "ok";
}
