import type {
  GenderPattern,
  Player,
  PointSide,
  TeamRules,
} from "@/types/models";
import { rosterById } from "@/lib/playerStats";

export interface LineValidationContext {
  roster: Player[];
  genderPattern: GenderPattern;
  side: PointSide;
  teamRules: TeamRules;
}

export function validateLineSize(playerIds: string[]): boolean {
  return playerIds.length === 7;
}

export function validateNoConsecutive(
  linePlayerIds: string[],
  lastPointPlayerIds: string[],
  exemptConsecutivePlayIds: string[] = [],
): boolean {
  if (lastPointPlayerIds.length === 0) return true;
  const last = new Set(lastPointPlayerIds);
  const exempt = new Set(exemptConsecutivePlayIds);
  return !linePlayerIds.some((id) => last.has(id) && !exempt.has(id));
}

export function validateGenderPattern(
  linePlayerIds: string[],
  roster: Player[],
  genderPattern: GenderPattern,
): boolean {
  const map = rosterById(roster);
  let m = 0;
  let f = 0;
  for (const id of linePlayerIds) {
    const p = map.get(id);
    if (!p) return false;
    if (p.gender === "MMP") m++;
    else f++;
  }
  if (genderPattern === "4M3F") return m === 4 && f === 3;
  return m === 3 && f === 4;
}

function isFemaleHandler(p: Player): boolean {
  if (p.gender !== "FMP") return false;
  if (p.primaryRole === "handler") return true;
  if (p.secondaryRole === "handler") return true;
  if (p.primaryRole === "hybrid") return p.handlerReliability >= 5;
  return false;
}

function isHandlerLike(p: Player): boolean {
  return (
    p.primaryRole === "handler" ||
    p.secondaryRole === "handler" ||
    (p.primaryRole === "hybrid" && p.handlerReliability >= 6)
  );
}

function countStrongHandlers(
  linePlayerIds: string[],
  map: Map<string, Player>,
  minRel: number,
): number {
  let n = 0;
  for (const id of linePlayerIds) {
    const p = map.get(id);
    if (!p) continue;
    if (p.handlerReliability >= minRel && isHandlerLike(p)) n++;
  }
  return n;
}

/** Yeşim counted as handler if in line and hybrid/handler profile. */
function yesimNeedsStrongHandlers(
  linePlayerIds: string[],
  map: Map<string, Player>,
  rules: TeamRules,
): boolean {
  if (!linePlayerIds.includes("yesim")) return true;
  const y = map.get("yesim");
  if (!y) return true;
  const strong = countStrongHandlers(linePlayerIds, map, rules.yesimHandlerStrongHandlerMin);
  const others = strong - (y.handlerReliability >= rules.yesimHandlerStrongHandlerMin ? 1 : 0);
  return others >= rules.yesimHandlerStrongHandlerCount;
}

function weakMaleCutterViolation(
  linePlayerIds: string[],
  map: Map<string, Player>,
  genderPattern: GenderPattern,
  rules: TeamRules,
): boolean {
  if (genderPattern !== "4F3M") return false;
  const males = linePlayerIds.filter((id) => map.get(id)?.gender === "MMP");
  if (males.length !== 3) return true;
  const primaryCutters = males.filter((id) => {
    const p = map.get(id);
    return p?.primaryRole === "cutter";
  });
  if (primaryCutters.length !== 1) return false;
  const only = primaryCutters[0];
  if (rules.weakMaleCutterIds.includes(only)) return true;
  return false;
}

function avoidWithViolation(
  linePlayerIds: string[],
  map: Map<string, Player>,
  hard: boolean,
): boolean {
  if (!hard) return false;
  const set = new Set(linePlayerIds);
  for (const id of linePlayerIds) {
    const p = map.get(id);
    if (!p?.avoidWith) continue;
    for (const other of p.avoidWith) {
      if (other !== id && set.has(other)) return true;
    }
  }
  return false;
}

function twoTopFemalesViolation(
  linePlayerIds: string[],
  map: Map<string, Player>,
  genderPattern: GenderPattern,
  rules: TeamRules,
): boolean {
  if (genderPattern !== "4F3M" || !rules.twoTopFemalesOn4F) return false;
  const females = linePlayerIds.filter((id) => map.get(id)?.gender === "FMP");
  const levels: Record<string, number> = {
    elite: 4,
    strong: 3,
    medium: 2,
    developing: 1,
  };
  const top = females.filter((id) => {
    const p = map.get(id);
    return p && levels[p.level] >= levels[rules.topFemaleLevel];
  });
  return top.length < 2;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateTeamRules(
  linePlayerIds: string[],
  ctx: LineValidationContext,
): ValidationResult {
  const errors: string[] = [];
  const map = rosterById(ctx.roster);

  if (!validateLineSize(linePlayerIds)) {
    errors.push("Line must have exactly 7 players.");
  }
  if (!validateGenderPattern(linePlayerIds, ctx.roster, ctx.genderPattern)) {
    errors.push("Gender ratio does not match selected pattern (4M-3F or 4F-3M).");
  }

  if (ctx.genderPattern === "4F3M" && ctx.teamRules.requireFemaleHandlerOn4F) {
    const hasFh = linePlayerIds.some((id) => {
      const p = map.get(id);
      return p && isFemaleHandler(p);
    });
    if (!hasFh) errors.push("4F point requires at least one female handler.");
  }

  if (ctx.genderPattern === "4F3M") {
    if (weakMaleCutterViolation(linePlayerIds, map, ctx.genderPattern, ctx.teamRules)) {
      errors.push("Weak male cutter cannot be the only male cutter on 4F.");
    }
  }

  if (!yesimNeedsStrongHandlers(linePlayerIds, map, ctx.teamRules)) {
    errors.push("Yeşim as handler needs two strong handlers in the line.");
  }

  if (avoidWithViolation(linePlayerIds, map, ctx.teamRules.enforceAvoidWithHard)) {
    errors.push("Line includes an avoid-with pair.");
  }

  if (twoTopFemalesViolation(linePlayerIds, map, ctx.genderPattern, ctx.teamRules)) {
    errors.push("4F point requires two top female players (when rule enabled).");
  }

  return { ok: errors.length === 0, errors };
}

export function validateFullLine(
  linePlayerIds: string[],
  lastPointPlayerIds: string[],
  ctx: LineValidationContext,
): ValidationResult {
  const base = validateTeamRules(linePlayerIds, ctx);
  const errors = [...base.errors];
  if (
    !validateNoConsecutive(
      linePlayerIds,
      lastPointPlayerIds,
      ctx.teamRules.exemptConsecutivePlayIds ?? [],
    )
  ) {
    errors.push("A player who played the previous point cannot play this point.");
  }
  return { ok: errors.length === 0, errors };
}
