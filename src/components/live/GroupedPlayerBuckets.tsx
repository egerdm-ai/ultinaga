import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { EnrichedPlayerRow } from "@/lib/playerBuckets";
import { BUCKET_ORDER, bucketLabel } from "@/lib/playerBuckets";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { urgencyStatus } from "@/lib/urgency";
import { cn } from "@/lib/utils";

function vsGroupLabel(v: "below" | "at" | "above"): string {
  if (v === "below") return "↓grp";
  if (v === "above") return "↑grp";
  return "~avg";
}

type SortKey = "urgency" | "since" | "played" | "name";

export function GroupedPlayerBuckets({
  rows,
  selectedIds,
  onPlayerClick,
  pointsRecorded,
  isPickable,
}: {
  rows: EnrichedPlayerRow[];
  selectedIds: Set<string>;
  onPlayerClick: (playerId: string) => void;
  pointsRecorded: number;
  isPickable: (playerId: string) => boolean;
}) {
  const [sortKey, setSortKey] = React.useState<SortKey>("urgency");
  const [hybridsOnly, setHybridsOnly] = React.useState(false);

  const byBucket = BUCKET_ORDER.map((key) => {
    let list = rows.filter((r) => r.bucket === key);
    if (hybridsOnly) {
      list = list.filter((r) => r.player.primaryRole === "hybrid");
    }
    const maxSince = Math.max(1, ...list.map((r) => r.since));
    const soft = (r: EnrichedPlayerRow) =>
      r.player.softMaxPoints ?? Math.max(r.player.minTargetPoints * 2, 8);
    const sorted = [...list].sort((a, b) => {
      if (sortKey === "urgency") return b.urgency - a.urgency;
      if (sortKey === "since") return b.since - a.since;
      if (sortKey === "played") return b.played - a.played;
      return a.player.name.localeCompare(b.player.name);
    });
    return { key, label: bucketLabel(key), rows: sorted, maxSince, soft };
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-sm font-bold tabular-nums text-primary">
            {pointsRecorded}
          </span>
          <span className="text-[10px] text-muted-foreground">points logged</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Switch
              id="hybrids-only"
              checked={hybridsOnly}
              onCheckedChange={setHybridsOnly}
              className="scale-90"
            />
            <Label htmlFor="hybrids-only" className="text-[10px]">
              Hybrid
            </Label>
          </div>
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey(v as SortKey)}
          >
            <SelectTrigger className="h-7 w-[120px] text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgency">Urgency</SelectItem>
              <SelectItem value="since">Rest</SelectItem>
              <SelectItem value="played">Played</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {byBucket.map(({ key, label, rows: bucketRows, maxSince, soft }) => (
          <div
            key={key}
            className="rounded-md border border-border bg-card/80 p-1.5 shadow-sm"
          >
            <div className="mb-1 flex items-center justify-between border-b border-border/80 pb-1">
              <span className="text-[10px] font-semibold leading-none">{label}</span>
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                {bucketRows.length}
              </Badge>
            </div>
            <div className="space-y-0.5">
              {bucketRows.length === 0 && (
                <p className="py-1 text-center text-[10px] text-muted-foreground">
                  —
                </p>
              )}
              {bucketRows.map((r) => {
                const sel = selectedIds.has(r.player.id);
                const pickable = isPickable(r.player.id);
                const heat = r.since / maxSince;
                const sMax = soft(r);
                const loadPct = Math.min(1, r.played / Math.max(1, sMax));
                return (
                  <button
                    key={r.player.id}
                    type="button"
                    disabled={!pickable}
                    title={
                      !pickable
                        ? r.eligibleNext
                          ? "Gender quota full (4M-3F / 4F-3M)"
                          : "Played last point"
                        : undefined
                    }
                    onClick={() => pickable && onPlayerClick(r.player.id)}
                    className={cn(
                      "w-full rounded border px-1 py-0.5 text-left text-[10px] leading-tight transition-colors",
                      sel &&
                        "border-violet-500 bg-violet-500/15 ring-1 ring-violet-500/40",
                      !sel &&
                        !pickable &&
                        "cursor-not-allowed border-transparent bg-muted/70 text-muted-foreground opacity-75",
                      !sel &&
                        pickable &&
                        r.eligibleNext &&
                        r.urgency >= 0.55 &&
                        "border-red-500/40 bg-red-500/10",
                      !sel &&
                        pickable &&
                        r.eligibleNext &&
                        r.urgency < 0.55 &&
                        (r.urgency >= 0.28 || r.relative.vsGroup === "below") &&
                        "border-amber-500/35 bg-amber-500/10",
                      !sel &&
                        pickable &&
                        r.eligibleNext &&
                        r.urgency < 0.28 &&
                        r.relative.vsGroup !== "below" &&
                        "border-emerald-500/20 bg-emerald-500/8",
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {r.player.name}
                        {r.player.primaryRole === "hybrid" && (
                          <span className="ml-0.5 text-[8px] text-muted-foreground">
                            H
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[8px] capitalize text-muted-foreground">
                        {r.player.level}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-[9px] text-muted-foreground">
                      <span className="tabular-nums">
                        <strong className="text-foreground">{r.played}</strong>/
                        {r.player.minTargetPoints}
                      </span>
                      <span
                        className={cn(
                          "tabular-nums",
                          heat >= 0.65 && "font-medium text-orange-600 dark:text-orange-400",
                        )}
                        title="Points since last played"
                      >
                        Δ{r.since}
                      </span>
                      <span className="tabular-nums">#{r.lastPoint ?? "—"}</span>
                      <span>{r.eligibleNext ? "✓" : "✗"}</span>
                      <UrgencyBadge
                        status={urgencyStatus(r.urgency)}
                        className="h-3.5 border px-0.5 text-[7px]"
                      />
                      <Badge
                        variant="secondary"
                        className={cn(
                          "h-3.5 px-1 text-[8px]",
                          r.relative.vsGroup === "below" &&
                            "border border-orange-500/40 bg-orange-500/15",
                        )}
                      >
                        {vsGroupLabel(r.relative.vsGroup)}
                      </Badge>
                    </div>
                    <div
                      className="mt-0.5 flex h-0.5 gap-px overflow-hidden rounded-sm bg-muted"
                      title="Load / rest"
                    >
                      <div
                        className={cn(
                          "h-full",
                          loadPct >= 1
                            ? "bg-red-500/90"
                            : loadPct >= 0.85
                              ? "bg-amber-500/90"
                              : "bg-primary/70",
                        )}
                        style={{ width: `${Math.min(100, loadPct * 50)}%` }}
                      />
                      <div
                        className="h-full bg-orange-500/80"
                        style={{ width: `${Math.min(100, heat * 50)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
