import type { GenderPattern, MatchPoint, PointSide } from "@/types/models";

/** Next point number we are building toward (1-based). */
export function nextPointNumberToBuild(points: MatchPoint[]): number {
  if (points.length === 0) return 1;
  return Math.max(...points.map((p) => p.pointNumber)) + 1;
}

/**
 * ABBA cadence for gender lines: A, B, B, A repeating (4-point cycle).
 * `starting` is the pattern for point 1 (and 4, 5, 8… in the cycle).
 */
export function genderAbbaForPoint(
  pointNumber: number,
  starting: GenderPattern,
): GenderPattern {
  const other: GenderPattern = starting === "4M3F" ? "4F3M" : "4M3F";
  const mod = (pointNumber - 1) % 4;
  if (mod === 0 || mod === 3) return starting;
  return other;
}

/**
 * Who pulls / plays next point. After at least one recorded point, flips from last result.
 * With no points yet, uses `startingSide` (match kickoff: O or D).
 */
export function nextSideAfterPoints(
  points: MatchPoint[],
  startingSideWhenEmpty: PointSide = "O",
): PointSide {
  if (points.length === 0) return startingSideWhenEmpty;
  const last = [...points].sort((a, b) => b.pointNumber - a.pointNumber)[0];
  return last.result === "scored" ? "D" : "O";
}

export function nextGenderPatternAfterPoints(
  points: MatchPoint[],
  starting: GenderPattern,
): GenderPattern {
  const n = nextPointNumberToBuild(points);
  return genderAbbaForPoint(n, starting);
}
