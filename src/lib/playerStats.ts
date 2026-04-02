import type { MatchPoint, Player } from "@/types/models";

/** Points played by this player across completed points (by player id). */
export function getPlayedCount(playerId: string, points: MatchPoint[]): number {
  return points.reduce(
    (n, p) => n + (p.players.includes(playerId) ? 1 : 0),
    0,
  );
}

/** Last point number where this player appeared, or null if never. */
export function getLastPlayedPoint(
  playerId: string,
  points: MatchPoint[],
): number | null {
  let last: number | null = null;
  for (const p of points) {
    if (p.players.includes(playerId)) last = p.pointNumber;
  }
  return last;
}

/**
 * Points since this player last played. If never played, returns `currentPointNumber`
 * (treat as maximum rest need). If last played current point, returns 0.
 */
export function getPointsSinceLastPlayed(
  playerId: string,
  points: MatchPoint[],
  currentPointNumber: number,
): number {
  const last = getLastPlayedPoint(playerId, points);
  if (last === null) return currentPointNumber;
  return Math.max(0, currentPointNumber - last);
}

export function getLastPointPlayerIds(points: MatchPoint[]): string[] {
  if (points.length === 0) return [];
  const max = Math.max(...points.map((p) => p.pointNumber));
  const last = points.find((p) => p.pointNumber === max);
  return last ? [...last.players] : [];
}

export function rosterById(roster: Player[]): Map<string, Player> {
  return new Map(roster.map((p) => [p.id, p]));
}
