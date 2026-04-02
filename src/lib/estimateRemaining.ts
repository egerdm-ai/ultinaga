import type { GameMode } from "@/types/models";

export const DEFAULT_GAME_CAP = 15;

/**
 * Heuristic remaining points in the game for urgency math.
 * Close games assume more points left; blowout assumes fewer.
 */
export function estimateRemainingPoints(
  scoreUs: number,
  scoreThem: number,
  mode: GameMode,
  cap: number = DEFAULT_GAME_CAP,
): number {
  const high = Math.max(scoreUs, scoreThem);
  const pointsToCap = Math.max(0, cap - high);

  if (mode === "close") {
    return Math.max(3, pointsToCap + 2);
  }
  if (mode === "blowout") {
    return Math.max(2, Math.min(pointsToCap, Math.floor(pointsToCap * 0.65)));
  }
  return Math.max(3, pointsToCap + 1);
}
