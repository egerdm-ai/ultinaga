import type { GameMode, MatchPoint, Player, PointSide } from "@/types/models";
import { estimateRemainingPoints } from "@/lib/estimateRemaining";
import { getPlayedCount, getPointsSinceLastPlayed, rosterById } from "@/lib/playerStats";
import { computeMinTargetUrgency } from "@/lib/urgency";
import { scoreOdFit } from "@/lib/scoring";

export interface CoachPill {
  id: string;
  label: string;
  names: string[];
}

export function buildCoachPills(
  roster: Player[],
  points: MatchPoint[],
  currentPointNumber: number,
  lastPointIds: string[],
  scoreUs: number,
  scoreThem: number,
  mode: GameMode,
  _nextSide: PointSide,
): CoachPill[] {
  const map = rosterById(roster);
  const last = new Set(lastPointIds);
  const pills: CoachPill[] = [];

  const mustSoon = roster
    .filter((p) => {
      const u = computeMinTargetUrgency(p, {
        points,
        currentPointNumber,
        scoreUs,
        scoreThem,
        mode,
      });
      return u >= 0.45 && !last.has(p.id);
    })
    .map((p) => p.name)
    .slice(0, 4);
  if (mustSoon.length) {
    pills.push({ id: "must", label: "Must play soon", names: mustSoon });
  }

  const cannot = lastPointIds
    .map((id) => map.get(id)?.name ?? id)
    .slice(0, 7);
  if (cannot.length) {
    pills.push({ id: "cannot", label: "Cannot play now", names: cannot });
  }

  const overused = roster.filter((p) => {
    const pl = getPlayedCount(p.id, points);
    const soft = p.softMaxPoints ?? 8;
    return pl >= soft;
  });
  if (overused.length) {
    pills.push({
      id: "over",
      label: "Over soft cap",
      names: overused.map((p) => p.name).slice(0, 4),
    });
  }

  const dFit = [...roster]
    .filter((p) => !last.has(p.id))
    .map((p) => ({
      p,
      fit: scoreOdFit([p.id], map, "D"),
    }))
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 4)
    .map((x) => x.p.name);
  if (dFit.length) {
    pills.push({ id: "dfit", label: "Best D fit (lean)", names: dFit });
  }

  const oFit = [...roster]
    .filter((p) => !last.has(p.id))
    .map((p) => ({
      p,
      fit: scoreOdFit([p.id], map, "O"),
    }))
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 4)
    .map((x) => x.p.name);
  if (oFit.length) {
    pills.push({ id: "ofit", label: "Best O fit (lean)", names: oFit });
  }

  return pills;
}

export interface MiniAnalytics {
  underMin: string[];
  atTarget: string[];
  overSoft: string[];
  longestRested: { name: string; since: number }[];
  hotLast3: { name: string; count: number }[];
  projectedRisk: { name: string; risk: number }[];
}

function pointsInLastN(
  playerId: string,
  points: MatchPoint[],
  n: number,
): number {
  const sorted = [...points].sort((a, b) => b.pointNumber - a.pointNumber);
  const slice = sorted.slice(0, n);
  return slice.filter((p) => p.players.includes(playerId)).length;
}

export function computeMiniAnalytics(
  roster: Player[],
  points: MatchPoint[],
  currentPointNumber: number,
  scoreUs: number,
  scoreThem: number,
  mode: GameMode,
): MiniAnalytics {
  const remaining = estimateRemainingPoints(scoreUs, scoreThem, mode);
  const underMin: string[] = [];
  const atTarget: string[] = [];
  const overSoft: string[] = [];
  const projectedRisk: { name: string; risk: number }[] = [];

  for (const p of roster) {
    const played = getPlayedCount(p.id, points);
    const need = p.minTargetPoints - played;
    if (need > 0) {
      underMin.push(p.name);
      const risk = need / Math.max(1, remaining);
      projectedRisk.push({ name: p.name, risk });
    } else if (played >= p.minTargetPoints) {
      atTarget.push(p.name);
    }
    const soft = p.softMaxPoints ?? 8;
    if (played >= soft) overSoft.push(p.name);
  }

  projectedRisk.sort((a, b) => b.risk - a.risk);

  const longestRested = roster
    .map((p) => ({
      name: p.name,
      since: getPointsSinceLastPlayed(p.id, points, currentPointNumber),
    }))
    .sort((a, b) => b.since - a.since)
    .slice(0, 5);

  const hotLast3 = roster
    .map((p) => ({
      name: p.name,
      count: pointsInLastN(p.id, points, 3),
    }))
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    underMin: underMin.slice(0, 8),
    atTarget: atTarget.slice(0, 8),
    overSoft: overSoft.slice(0, 6),
    longestRested,
    hotLast3,
    projectedRisk: projectedRisk.slice(0, 6),
  };
}
