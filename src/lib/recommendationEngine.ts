import type {
  GenderPattern,
  GameMode,
  LineTemplate,
  Player,
  PointSide,
} from "@/types/models";
import type { MatchPoint } from "@/types/models";
import type { TeamRules } from "@/types/models";
import { combinations } from "@/lib/combinations";
import { rosterById } from "@/lib/playerStats";
import { validateFullLine, type LineValidationContext } from "@/lib/rules";
import {
  scoreLineComposite,
  scoreObjectives,
  type LineScoreBreakdown,
  type ObjectiveScores,
  type ScoreContext,
} from "@/lib/scoring";
import { playerTacticalWeight } from "@/lib/teamTruth";
import { warningsForLine } from "@/lib/lineWarnings";

export interface NextContext {
  side: PointSide;
  genderPattern: GenderPattern;
  mode: GameMode;
}

const MAX_RAW_CANDIDATES = 12000;
const TOP_M = 11;
const TOP_F = 11;

function quickSuitability(
  p: Player,
  side: PointSide,
  genderPattern: GenderPattern,
): number {
  let s =
    (p.handlerReliability + p.cutterImpact + p.defenseImpact) *
    playerTacticalWeight(p.id);
  if (p.sideStrength === side) s += 5;
  else if (p.sideStrength === "two-way") s += 3.5;
  if (genderPattern === "4F3M" && p.gender === "MMP" && p.primaryRole === "cutter") {
    s += p.cutterImpact * 0.55;
  }
  return s;
}

export function getEligiblePlayerIds(
  roster: Player[],
  lastPointPlayerIds: string[],
): string[] {
  const last = new Set(lastPointPlayerIds);
  return roster.filter((p) => !last.has(p.id)).map((p) => p.id);
}

function bucketEligible(
  eligibleIds: string[],
  map: Map<string, Player>,
): { males: string[]; females: string[] } {
  const males: string[] = [];
  const females: string[] = [];
  for (const id of eligibleIds) {
    const p = map.get(id);
    if (!p) continue;
    if (p.gender === "MMP") males.push(id);
    else females.push(id);
  }
  return { males, females };
}

function generateLineCandidates(
  males: string[],
  females: string[],
  genderPattern: GenderPattern,
  map: Map<string, Player>,
  side: PointSide,
): string[][] {
  const sortIds = (ids: string[]) =>
    [...ids].sort(
      (a, b) =>
        quickSuitability(map.get(a)!, side, genderPattern) -
        quickSuitability(map.get(b)!, side, genderPattern),
    );

  const takeM = sortIds(males).slice(0, TOP_M);
  const takeF = sortIds(females).slice(0, TOP_F);

  const out: string[][] = [];

  if (genderPattern === "4M3F") {
    if (takeM.length < 4 || takeF.length < 3) return [];
    for (const m of combinations(takeM, 4)) {
      for (const f of combinations(takeF, 3)) {
        out.push([...m, ...f]);
        if (out.length >= MAX_RAW_CANDIDATES) return out;
      }
    }
    return out;
  }

  if (takeM.length < 3 || takeF.length < 4) return [];
  for (const m of combinations(takeM, 3)) {
    for (const f of combinations(takeF, 4)) {
      out.push([...m, ...f]);
      if (out.length >= MAX_RAW_CANDIDATES) return out;
    }
  }
  return out;
}

function templateBoost(
  lineIds: string[],
  savedLines: LineTemplate[] | undefined,
  side: PointSide,
  genderPattern: GenderPattern,
): number {
  if (!savedLines?.length) return 0;
  const relevant = savedLines.filter(
    (t) => t.side === side && t.genderPattern === genderPattern,
  );
  let best = 0;
  const set = new Set(lineIds);
  for (const t of relevant) {
    const overlap = t.players.filter((id) => set.has(id)).length;
    if (overlap === 7) return 0.14;
    if (overlap >= 5) best = Math.max(best, 0.07);
    if (overlap >= 4) best = Math.max(best, 0.04);
  }
  return best;
}

function lineSatisfiesLocked(lineIds: string[], locked: string[]): boolean {
  if (locked.length === 0) return true;
  const s = new Set(lineIds);
  return locked.every((id) => s.has(id));
}

function kindLabelForMode(mode: GameMode, point: "best" | "rot" | "pres"): string {
  if (point === "best") {
    if (mode === "close") return "Close-game best";
    if (mode === "blowout") return "Spread / priority win";
    return "Balanced tactical best";
  }
  if (point === "rot") return "Rotation-safe";
  return "Min-target pressure";
}

export interface ScoredLine {
  playerIds: string[];
  /** Display score depends on card type (winning / rotation / pressure). */
  score: number;
  breakdown: LineScoreBreakdown;
  objectiveScores: ObjectiveScores;
  kindLabel: string;
  bullets: string[];
  warnings: string[];
}

function buildBullets(
  breakdown: LineScoreBreakdown,
  kind: "best" | "rot" | "pres",
): string[] {
  const out: string[] = [];
  if (kind === "best") {
    if (breakdown.clutch > 0.65) out.push("High leverage / elite mix for this context.");
    if (breakdown.odFit > 0.72) out.push("Strong O/D lean fit.");
    if (breakdown.handlerStability > 0.65) out.push("Reliable handler core.");
  } else if (kind === "rot") {
    if (breakdown.overplayPenalty < 0.22) out.push("Rest-conscious — lighter on overloaded players.");
    if (breakdown.minTarget > 0.35) out.push("Still helps min-target gaps.");
  } else {
    if (breakdown.minTarget > 0.45) out.push("Prioritizes players behind on minimum points.");
    if (breakdown.chemistry > 0.75) out.push("Keeps chemistry where possible.");
  }
  if (breakdown.chemistry > 0.85) out.push("Ege + Yeşim + Alp chemistry available.");
  if (breakdown.genderFit > 0.72 && breakdown.genderFit !== 0.75) {
    out.push("4F handler / male cutter preferences respected.");
  }
  if (out.length === 0) out.push("Legal, balanced line for this objective.");
  return out.slice(0, 5);
}

function pickDistinct(
  ranked: ScoredLine[],
  avoid: ScoredLine[],
): ScoredLine | null {
  const avoidKeys = new Set(avoid.map((x) => [...x.playerIds].sort().join()));
  for (const r of ranked) {
    const k = [...r.playerIds].sort().join();
    if (!avoidKeys.has(k)) return r;
  }
  return ranked[1] ?? ranked[0] ?? null;
}

function scoreLineEntry(
  playerIds: string[],
  scoreCtx: ScoreContext,
  lineCtx: LineValidationContext,
  lastIds: string[],
  savedLines: LineTemplate[] | undefined,
  teamRules: TeamRules,
): ScoredLine | null {
  const v = validateFullLine(playerIds, lastIds, lineCtx);
  if (!v.ok) return null;
  const breakdown = scoreLineComposite(playerIds, scoreCtx);
  const obj = scoreObjectives(playerIds, scoreCtx, breakdown);
  const tb = templateBoost(
    playerIds,
    savedLines,
    scoreCtx.side,
    scoreCtx.genderPattern,
  );
  const winAdj = obj.winning + tb;
  const rotAdj = obj.rotation + tb * 0.4;
  const presAdj = obj.pressure + tb * 0.35;

  const objectiveScores: ObjectiveScores = {
    winning: winAdj,
    rotation: rotAdj,
    pressure: presAdj,
  };

  const warnings = warningsForLine(playerIds, scoreCtx, teamRules);
  return {
    playerIds,
    score: winAdj,
    breakdown,
    objectiveScores,
    kindLabel: "",
    bullets: [],
    warnings,
  };
}

export interface RecommendationResult {
  best: ScoredLine | null;
  rotationSafe: ScoredLine | null;
  mustPlayPressure: ScoredLine | null;
  eligiblePlayerIds: string[];
  ineligibleBecauseConsecutive: string[];
  lastPointPlayerIds: string[];
  allScored: ScoredLine[];
}

export function recommendNextLine(
  roster: Player[],
  points: MatchPoint[],
  next: NextContext,
  teamRules: TeamRules,
  opts: {
    scoreUs: number;
    scoreThem: number;
    lastPointPlayerIds: string[];
    lockedPlayerIds?: string[];
    savedLines?: LineTemplate[];
  },
): RecommendationResult {
  const map = rosterById(roster);
  const baseEligible = getEligiblePlayerIds(roster, opts.lastPointPlayerIds);
  const locked = (opts.lockedPlayerIds ?? []).filter((id) =>
    baseEligible.includes(id),
  );
  const eligiblePlayerIds = baseEligible;

  const { males, females } = bucketEligible(eligiblePlayerIds, map);

  const needM = next.genderPattern === "4M3F" ? 4 : 3;
  const needF = next.genderPattern === "4M3F" ? 3 : 4;

  const empty: RecommendationResult = {
    best: null,
    rotationSafe: null,
    mustPlayPressure: null,
    eligiblePlayerIds,
    ineligibleBecauseConsecutive: opts.lastPointPlayerIds,
    lastPointPlayerIds: opts.lastPointPlayerIds,
    allScored: [],
  };

  if (males.length < needM || females.length < needF) {
    return empty;
  }

  let raw = generateLineCandidates(
    males,
    females,
    next.genderPattern,
    map,
    next.side,
  );
  if (locked.length) {
    raw = raw.filter((ids) => lineSatisfiesLocked(ids, locked));
  }

  const lineCtx: LineValidationContext = {
    roster,
    genderPattern: next.genderPattern,
    side: next.side,
    teamRules,
  };

  const currentPointNumber =
    points.length === 0 ? 1 : Math.max(...points.map((p) => p.pointNumber)) + 1;

  const scoreCtx: ScoreContext = {
    roster,
    points,
    currentPointNumber,
    scoreUs: opts.scoreUs,
    scoreThem: opts.scoreThem,
    side: next.side,
    genderPattern: next.genderPattern,
    mode: next.mode,
    teamRules,
  };

  const valid: ScoredLine[] = [];
  for (const ids of raw) {
    const entry = scoreLineEntry(
      ids,
      scoreCtx,
      lineCtx,
      opts.lastPointPlayerIds,
      opts.savedLines,
      teamRules,
    );
    if (!entry) continue;
    valid.push(entry);
  }

  if (!valid.length) return empty;

  const byWin = [...valid].sort(
    (a, b) => b.objectiveScores.winning - a.objectiveScores.winning,
  );
  const byRot = [...valid].sort(
    (a, b) => b.objectiveScores.rotation - a.objectiveScores.rotation,
  );
  const byPres = [...valid].sort(
    (a, b) => b.objectiveScores.pressure - a.objectiveScores.pressure,
  );

  const best = byWin[0]!;
  best.kindLabel = kindLabelForMode(next.mode, "best");
  best.score = best.objectiveScores.winning;
  best.bullets = buildBullets(best.breakdown, "best");

  let rotationSafe = pickDistinct(byRot, [best]) ?? byRot[0]!;
  rotationSafe = { ...rotationSafe };
  rotationSafe.kindLabel = kindLabelForMode(next.mode, "rot");
  rotationSafe.score = rotationSafe.objectiveScores.rotation;
  rotationSafe.bullets = buildBullets(rotationSafe.breakdown, "rot");

  let mustPlayPressure = pickDistinct(byPres, [best, rotationSafe]) ?? byPres[0]!;
  mustPlayPressure = { ...mustPlayPressure };
  mustPlayPressure.kindLabel = "Min-target rescue";
  mustPlayPressure.score = mustPlayPressure.objectiveScores.pressure;
  mustPlayPressure.bullets = buildBullets(mustPlayPressure.breakdown, "pres");

  return {
    best,
    rotationSafe,
    mustPlayPressure,
    eligiblePlayerIds,
    ineligibleBecauseConsecutive: opts.lastPointPlayerIds,
    lastPointPlayerIds: opts.lastPointPlayerIds,
    allScored: byWin.slice(0, 40),
  };
}

