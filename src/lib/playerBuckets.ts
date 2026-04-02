import type { Player } from "@/types/models";
import type { PlayerRowStats } from "@/lib/analytics";

export type BucketKey =
  | "maleHandlers"
  | "maleCutters"
  | "femaleHandlers"
  | "femaleCutters";

const BUCKET_LABEL: Record<BucketKey, string> = {
  maleHandlers: "Male handlers",
  maleCutters: "Male cutters",
  femaleHandlers: "Female handlers",
  femaleCutters: "Female cutters",
};

export function bucketLabel(key: BucketKey): string {
  return BUCKET_LABEL[key];
}

/** Hybrid goes to handler bucket if handlerRel >= cutterImpact, else cutter bucket. */
export function bucketForPlayer(p: Player): BucketKey {
  const male = p.gender === "MMP";
  if (p.primaryRole === "handler") {
    return male ? "maleHandlers" : "femaleHandlers";
  }
  if (p.primaryRole === "cutter") {
    return male ? "maleCutters" : "femaleCutters";
  }
  const handlerLean = p.handlerReliability >= p.cutterImpact;
  if (handlerLean) {
    return male ? "maleHandlers" : "femaleHandlers";
  }
  return male ? "maleCutters" : "femaleCutters";
}

export const BUCKET_ORDER: BucketKey[] = [
  "maleHandlers",
  "maleCutters",
  "femaleHandlers",
  "femaleCutters",
];

export interface GroupRelativeStats {
  bucketAvgPlayed: number;
  /** Positive = above bucket average. */
  deltaVsBucket: number;
  /** "below" | "at" | "above" bucket mean */
  vsGroup: "below" | "at" | "above";
}

export function computeBucketAverages(
  roster: Player[],
  playedById: Map<string, number>,
): Map<BucketKey, number> {
  const sums = new Map<BucketKey, { sum: number; n: number }>();
  for (const k of BUCKET_ORDER) {
    sums.set(k, { sum: 0, n: 0 });
  }
  for (const p of roster) {
    const b = bucketForPlayer(p);
    const played = playedById.get(p.id) ?? 0;
    const cur = sums.get(b)!;
    cur.sum += played;
    cur.n += 1;
  }
  const out = new Map<BucketKey, number>();
  for (const k of BUCKET_ORDER) {
    const { sum, n } = sums.get(k)!;
    out.set(k, n > 0 ? sum / n : 0);
  }
  return out;
}

export function relativeVsBucket(
  playerId: string,
  played: number,
  roster: Player[],
  playedById: Map<string, number>,
): GroupRelativeStats {
  const avgs = computeBucketAverages(roster, playedById);
  const p = roster.find((x) => x.id === playerId);
  if (!p) {
    return { bucketAvgPlayed: 0, deltaVsBucket: 0, vsGroup: "at" };
  }
  const b = bucketForPlayer(p);
  const avg = avgs.get(b) ?? 0;
  const delta = played - avg;
  const vsGroup: GroupRelativeStats["vsGroup"] =
    delta < -0.75 ? "below" : delta > 0.75 ? "above" : "at";
  return { bucketAvgPlayed: avg, deltaVsBucket: delta, vsGroup };
}

export interface EnrichedPlayerRow extends PlayerRowStats {
  bucket: BucketKey;
  relative: GroupRelativeStats;
}

export function enrichPlayerRows(
  rows: PlayerRowStats[],
  roster: Player[],
): EnrichedPlayerRow[] {
  const playedById = new Map(rows.map((r) => [r.player.id, r.played]));
  return rows.map((r) => ({
    ...r,
    bucket: bucketForPlayer(r.player),
    relative: relativeVsBucket(r.player.id, r.played, roster, playedById),
  }));
}
