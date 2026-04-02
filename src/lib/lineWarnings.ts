import type { Player, TeamRules } from "@/types/models";
import { rosterById } from "@/lib/playerStats";
import { TEAM } from "@/lib/teamTruth";
import type { ScoreContext } from "@/lib/scoring";
import { scoreLineComposite } from "@/lib/scoring";
import { estimateRemainingPoints } from "@/lib/estimateRemaining";
import { getPlayedCount } from "@/lib/playerStats";
import { computeMinTargetUrgency } from "@/lib/urgency";

function isHandlerLike(p: Player): boolean {
  return (
    p.primaryRole === "handler" ||
    p.secondaryRole === "handler" ||
    (p.primaryRole === "hybrid" && p.handlerReliability >= 6)
  );
}

function countStrongHandlers(
  lineIds: string[],
  map: Map<string, Player>,
  minRel: number,
): number {
  let n = 0;
  for (const id of lineIds) {
    const p = map.get(id);
    if (!p) continue;
    if (p.handlerReliability >= minRel && isHandlerLike(p)) n++;
  }
  return n;
}

export function warningsForLine(
  linePlayerIds: string[],
  ctx: ScoreContext,
  teamRules: TeamRules,
): string[] {
  const map = rosterById(ctx.roster);
  const w: string[] = [];
  const gp = ctx.genderPattern;

  if (gp === "4F3M") {
    const males = linePlayerIds.filter((id) => map.get(id)?.gender === "MMP");
    const weakCutter = males.find((id) => {
      const p = map.get(id);
      return (
        p &&
        teamRules.weakMaleCutterIds.includes(id) &&
        p.primaryRole === "cutter"
      );
    });
    const onlyMaleCutter =
      males.filter((id) => map.get(id)?.primaryRole === "cutter").length === 1;
    if (weakCutter && onlyMaleCutter) {
      w.push("Weak male cutter on 4F — high risk.");
    }
    const topFemales = linePlayerIds.filter((id) => {
      const p = map.get(id);
      return p?.gender === "FMP" && (p.level === "elite" || p.level === "strong");
    }).length;
    if (topFemales < 2) {
      w.push("4F point: consider more top-end female talent.");
    }
  }

  if (linePlayerIds.includes("yesim")) {
    const y = map.get("yesim");
    if (y) {
      const strong = countStrongHandlers(
        linePlayerIds,
        map,
        teamRules.yesimHandlerStrongHandlerMin,
      );
      const others =
        strong -
        (y.handlerReliability >= teamRules.yesimHandlerStrongHandlerMin ? 1 : 0);
      if (others < teamRules.yesimHandlerStrongHandlerCount) {
        w.push("Yeşim needs two strong handlers alongside.");
      }
    }
  }

  if (
    linePlayerIds.includes(TEAM.ramNaja[0]) &&
    linePlayerIds.includes(TEAM.ramNaja[1])
  ) {
    const pr = map.get(TEAM.ramNaja[0]);
    const pn = map.get(TEAM.ramNaja[1]);
    if (pr?.primaryRole === "handler" && pn?.primaryRole === "handler") {
      w.push("Ram + Naja as main handler pair — avoid.");
    }
  }

  if (ctx.mode === "close") {
    const bd = scoreLineComposite(linePlayerIds, ctx);
    const hi = Math.max(ctx.scoreUs, ctx.scoreThem);
    const late = hi >= 12;
    if (late && bd.total < 0.42) {
      w.push("Late close game: line quality looks light — consider more elite.");
    }
  }

  for (const id of linePlayerIds) {
    const p = map.get(id);
    if (!p) continue;
    const u = computeMinTargetUrgency(p, {
      points: ctx.points,
      currentPointNumber: ctx.currentPointNumber,
      scoreUs: ctx.scoreUs,
      scoreThem: ctx.scoreThem,
      mode: ctx.mode,
    });
    const rem = estimateRemainingPoints(ctx.scoreUs, ctx.scoreThem, ctx.mode);
    const need = Math.max(0, p.minTargetPoints - getPlayedCount(id, ctx.points));
    if (need > 0 && u >= 0.55 && rem <= 4) {
      w.push(`${p.name} may miss min target if not used very soon.`);
      break;
    }
  }

  return w;
}
