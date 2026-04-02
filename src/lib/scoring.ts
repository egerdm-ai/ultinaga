import type {
  GameMode,
  GenderPattern,
  Player,
  PointSide,
  TeamRules,
} from "@/types/models";
import { getPlayedCount, getPointsSinceLastPlayed } from "@/lib/playerStats";
import { estimateRemainingPoints } from "@/lib/estimateRemaining";
import type { MatchPoint } from "@/types/models";
import { rosterById } from "@/lib/playerStats";
import { computeMinTargetUrgency } from "@/lib/urgency";
import { TEAM, playerTacticalWeight } from "@/lib/teamTruth";

export interface ScoreContext {
  roster: Player[];
  points: MatchPoint[];
  currentPointNumber: number;
  scoreUs: number;
  scoreThem: number;
  side: PointSide;
  genderPattern: GenderPattern;
  mode: GameMode;
  teamRules: TeamRules;
}

const W = {
  handlerStability: 0.22,
  cutterImpact: 0.16,
  defense: 0.16,
  minTarget: 0.12,
  chemistry: 0.1,
  odFit: 0.08,
  genderFit: 0.08,
  clutch: 0.08,
  overplay: 0.1,
} as const;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function norm(n: number, max: number): number {
  return clamp01(max > 0 ? n / max : 0);
}

export function scoreHandlerStability(
  linePlayerIds: string[],
  map: Map<string, Player>,
): number {
  let sum = 0;
  for (const id of linePlayerIds) {
    const p = map.get(id);
    if (!p) continue;
    sum += p.handlerReliability;
  }
  return norm(sum, 70);
}

export function scoreCutterImpact(
  linePlayerIds: string[],
  map: Map<string, Player>,
): number {
  let sum = 0;
  for (const id of linePlayerIds) {
    const p = map.get(id);
    if (!p) continue;
    sum += p.cutterImpact;
  }
  return norm(sum, 70);
}

export function scoreDefense(
  linePlayerIds: string[],
  map: Map<string, Player>,
): number {
  let sum = 0;
  for (const id of linePlayerIds) {
    const p = map.get(id);
    if (!p) continue;
    sum += p.defenseImpact;
  }
  return norm(sum, 70);
}

export function scoreChemistry(
  linePlayerIds: string[],
  rules: TeamRules,
): number {
  const [a, b, c] = rules.chemistryTripleBonus;
  const set = new Set(linePlayerIds);
  if (set.has(a) && set.has(b) && set.has(c)) return 1;
  return 0.35;
}

export function scoreRamNajaPenalty(
  linePlayerIds: string[],
  map: Map<string, Player>,
  rules: TeamRules,
): number {
  const [r, n] = rules.handlerDuoPenalty;
  if (!linePlayerIds.includes(r) || !linePlayerIds.includes(n)) return 0;
  if (!rules.ramNajaMainHandlerPenaltyOnly) return 0.55;
  const pr = map.get(r);
  const pn = map.get(n);
  if (!pr || !pn) return 0;
  const bothHandlers =
    pr.primaryRole === "handler" &&
    pn.primaryRole === "handler";
  return bothHandlers ? 0.6 : 0.15;
}

export function scoreOverplayPenalty(
  linePlayerIds: string[],
  ctx: ScoreContext,
): number {
  const map = rosterById(ctx.roster);
  let pen = 0;
  for (const id of linePlayerIds) {
    const p = map.get(id);
    if (!p) continue;
    const played = getPlayedCount(id, ctx.points);
    const soft = p.softMaxPoints ?? 8;
    const krisna = id === "krisna" ? ctx.teamRules.krisnaSoftLoadMultiplier : 1;
    if (played >= soft * krisna) pen += 0.35;
    else if (played >= soft) pen += 0.2;
  }
  if (ctx.mode === "close") {
    const highUsage = linePlayerIds.filter(
      (id) => getPlayedCount(id, ctx.points) >= 6,
    ).length;
    pen += highUsage * 0.05;
  }
  return clamp01(pen);
}

export function scoreMinTargetCoverage(
  linePlayerIds: string[],
  ctx: ScoreContext,
): number {
  const map = rosterById(ctx.roster);
  const remaining = Math.max(
    1,
    estimateRemainingPoints(ctx.scoreUs, ctx.scoreThem, ctx.mode),
  );
  let score = 0;
  for (const id of linePlayerIds) {
    const p = map.get(id);
    if (!p) continue;
    const played = getPlayedCount(id, ctx.points);
    const need = Math.max(0, p.minTargetPoints - played);
    score += need > 0 ? Math.min(1, need / remaining) : 0;
  }
  return norm(score, 5);
}

function levelWeight(level: Player["level"], mode: GameMode): number {
  const order = { elite: 4, strong: 3, medium: 2, developing: 1 };
  const w = order[level];
  if (mode === "close") return w / 4;
  if (mode === "blowout") return (5 - w) / 4;
  return 0.25;
}

export function scoreClutchLine(
  linePlayerIds: string[],
  map: Map<string, Player>,
  mode: GameMode,
): number {
  let s = 0;
  for (const id of linePlayerIds) {
    const p = map.get(id);
    if (!p) continue;
    s += levelWeight(p.level, mode);
  }
  return norm(s, 4);
}

function odFitPlayer(p: Player, side: PointSide): number {
  if (p.sideStrength === "two-way") return 0.85;
  if (p.sideStrength === side) return 1;
  return 0.45;
}

export function scoreOdFit(
  linePlayerIds: string[],
  map: Map<string, Player>,
  side: PointSide,
): number {
  let s = 0;
  for (const id of linePlayerIds) {
    const p = map.get(id);
    if (!p) continue;
    s += odFitPlayer(p, side);
  }
  return norm(s, 7);
}

export function scoreGenderPatternFit(
  linePlayerIds: string[],
  map: Map<string, Player>,
  side: PointSide,
  genderPattern: GenderPattern,
  rules: TeamRules,
): number {
  if (genderPattern !== "4F3M") return 0.75;
  let s = 0.5;
  const pref =
    side === "O"
      ? rules.preferredFemaleHandlerO4F
      : rules.preferredFemaleHandlerD4F;
  if (linePlayerIds.includes(pref)) s += 0.25;
  const order = rules.maleCutterPreference4F;
  const males = linePlayerIds.filter((id) => map.get(id)?.gender === "MMP");
  const maleCutters = males.filter(
    (id) => map.get(id)?.primaryRole === "cutter",
  );
  if (maleCutters.length === 1) {
    const m = maleCutters[0];
    const rank = order.indexOf(m);
    if (rank === 0) s += 0.2;
    else if (rank === 1) s += 0.12;
    else if (rank === 2) s += 0.05;
  }
  for (const id of males) {
    const p = map.get(id);
    if (!p) continue;
    if (
      p.gender === "MMP" &&
      rules.weakMaleCutterIds.includes(id) &&
      p.primaryRole === "cutter"
    ) {
      s -= 0.15;
    }
  }
  return clamp01(s);
}

export function scoreWeakMaleCutterSoft(
  linePlayerIds: string[],
  map: Map<string, Player>,
  genderPattern: GenderPattern,
  rules: TeamRules,
): number {
  if (genderPattern !== "4F3M") return 0;
  let pen = 0;
  for (const id of linePlayerIds) {
    const p = map.get(id);
    if (!p || p.gender !== "MMP") continue;
    if (rules.weakMaleCutterIds.includes(id) && p.primaryRole === "cutter") {
      pen += 0.2;
    }
  }
  return pen;
}

export interface LineScoreBreakdown {
  total: number;
  handlerStability: number;
  cutterImpact: number;
  defense: number;
  minTarget: number;
  chemistry: number;
  odFit: number;
  genderFit: number;
  clutch: number;
  overplayPenalty: number;
  ramNajaPenalty: number;
  weakMaleSoft: number;
}

export function scoreLineComposite(
  linePlayerIds: string[],
  ctx: ScoreContext,
): LineScoreBreakdown {
  const map = rosterById(ctx.roster);
  const h = scoreHandlerStability(linePlayerIds, map);
  const c = scoreCutterImpact(linePlayerIds, map);
  const d = scoreDefense(linePlayerIds, map);
  const m = scoreMinTargetCoverage(linePlayerIds, ctx);
  const chem = scoreChemistry(linePlayerIds, ctx.teamRules);
  const od = scoreOdFit(linePlayerIds, map, ctx.side);
  const gf = scoreGenderPatternFit(
    linePlayerIds,
    map,
    ctx.side,
    ctx.genderPattern,
    ctx.teamRules,
  );
  const clutch = scoreClutchLine(linePlayerIds, map, ctx.mode);
  const over = scoreOverplayPenalty(linePlayerIds, ctx);
  const rn = scoreRamNajaPenalty(linePlayerIds, map, ctx.teamRules);
  const weak = scoreWeakMaleCutterSoft(
    linePlayerIds,
    map,
    ctx.genderPattern,
    ctx.teamRules,
  );

  const modeWeights = (() => {
    if (ctx.mode === "close") {
      return { ...W, minTarget: 0.08, clutch: 0.12 };
    }
    if (ctx.mode === "blowout") {
      return { ...W, minTarget: 0.18, clutch: 0.05 };
    }
    return W;
  })();

  const total =
    modeWeights.handlerStability * h +
    modeWeights.cutterImpact * c +
    modeWeights.defense * d +
    modeWeights.minTarget * m +
    modeWeights.chemistry * chem +
    modeWeights.odFit * od +
    modeWeights.genderFit * gf +
    modeWeights.clutch * clutch -
    modeWeights.overplay * over -
    rn * 0.14 -
    weak * 0.16;

  return {
    total,
    handlerStability: h,
    cutterImpact: c,
    defense: d,
    minTarget: m,
    chemistry: chem,
    odFit: od,
    genderFit: gf,
    clutch,
    overplayPenalty: over,
    ramNajaPenalty: rn,
    weakMaleSoft: weak,
  };
}

const CAP = 15;

/** 0–1: higher when the game is late and still close — boosts elite / anchor lines. */
export function lateGameFactor(ctx: ScoreContext): number {
  if (ctx.mode !== "close") return 0.22;
  const hi = Math.max(ctx.scoreUs, ctx.scoreThem);
  const ptsLeft = Math.max(0, CAP - hi);
  const diff = Math.abs(ctx.scoreUs - ctx.scoreThem);
  const tight = diff <= 2;
  if (ptsLeft <= 2 && tight) return 0.95;
  if (ptsLeft <= 4 && tight) return 0.78;
  if (ptsLeft <= 6) return 0.55;
  return 0.32;
}

export function teamAnchorBonus(lineIds: string[], ctx: ScoreContext): number {
  let b = 0;
  if (ctx.side === "O" && lineIds.includes(TEAM.oAnchor)) b += 0.2;
  if (ctx.side === "D" && lineIds.includes(TEAM.dAnchor)) b += 0.18;
  if (ctx.genderPattern === "4F3M") {
    if (ctx.side === "O" && lineIds.includes(TEAM.femaleHandlerO)) b += 0.14;
    if (ctx.side === "D" && lineIds.includes(TEAM.femaleHandlerD)) b += 0.14;
  }
  return clamp01(b);
}

export function averagePedigree(lineIds: string[]): number {
  let s = 0;
  for (const id of lineIds) s += playerTacticalWeight(id);
  return norm(s / 7, 1.18);
}

function yanMarieBonuses(lineIds: string[], ctx: ScoreContext): number {
  let b = 0;
  if (ctx.side === "D" && lineIds.includes(TEAM.yanDLean)) b += 0.07;
  if (lineIds.includes(TEAM.joelEliteCutterBoost)) b += 0.05;
  if (lineIds.includes(TEAM.marieStableVsMolly.marie) && !lineIds.includes(TEAM.marieStableVsMolly.molly)) {
    b += 0.02;
  }
  return b;
}

export interface ObjectiveScores {
  winning: number;
  rotation: number;
  pressure: number;
}

export function scoreObjectives(
  lineIds: string[],
  ctx: ScoreContext,
  breakdown: LineScoreBreakdown,
): ObjectiveScores {
  const map = rosterById(ctx.roster);
  const base = breakdown.total;
  const late = lateGameFactor(ctx);
  const anchor = teamAnchorBonus(lineIds, ctx);
  const ped = averagePedigree(lineIds);
  const yan = yanMarieBonuses(lineIds, ctx);

  const winning =
    base +
    0.26 * anchor +
    late * (0.34 * ped + 0.2 * breakdown.clutch + 0.12 * breakdown.handlerStability) +
    0.08 * breakdown.cutterImpact +
    yan;

  let restSum = 0;
  for (const id of lineIds) {
    const since = getPointsSinceLastPlayed(
      id,
      ctx.points,
      ctx.currentPointNumber,
    );
    restSum += norm(since, 12);
  }
  const restAvg = restSum / 7;

  const rotation =
    0.44 * base +
    0.24 * restAvg +
    0.16 * (1 - breakdown.overplayPenalty) +
    0.14 * breakdown.minTarget -
    0.1 * breakdown.overplayPenalty +
    0.06 * (1 - breakdown.ramNajaPenalty);

  let urgentMass = 0;
  for (const id of lineIds) {
    const p = map.get(id);
    if (!p) continue;
    urgentMass += computeMinTargetUrgency(p, {
      points: ctx.points,
      currentPointNumber: ctx.currentPointNumber,
      scoreUs: ctx.scoreUs,
      scoreThem: ctx.scoreThem,
      mode: ctx.mode,
    });
  }
  urgentMass /= 7;

  let pressure =
    0.52 * breakdown.minTarget +
    0.3 * base +
    0.12 * breakdown.chemistry +
    0.08 * anchor +
    0.06 * ped;
  if (urgentMass < 0.32) pressure *= 0.68;

  return { winning, rotation, pressure };
}
