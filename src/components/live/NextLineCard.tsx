import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ScoredLine } from "@/lib/recommendationEngine";
import type { Player } from "@/types/models";
import { rosterById } from "@/lib/playerStats";
import { assignPlayersToSlots, type SlotId } from "@/lib/lineSlotting";
import { cn } from "@/lib/utils";

const tint = {
  best: "border-primary/40 bg-primary/5",
  rotation: "border-emerald-500/35 bg-emerald-500/5",
  pressure: "border-amber-500/40 bg-amber-500/5",
} as const;

const H_SLOTS = ["H1", "H2", "H3"] as const;
const C_SLOTS = ["C1", "C2", "C3", "C4"] as const;

function roleShort(p: Player): string {
  if (p.primaryRole === "handler") return "han";
  if (p.primaryRole === "cutter") return "cut";
  return "hyb";
}

function MiniCell({
  slot,
  id,
  map,
}: {
  slot: string;
  id: string;
  map: Map<string, Player>;
}) {
  const p = map.get(id);
  if (!p) return <span className="text-[9px] text-muted-foreground">—</span>;
  return (
    <div
      className={cn(
        "flex min-h-[36px] items-center gap-1 rounded border bg-background/90 px-1.5 py-0.5",
        p.gender === "MMP"
          ? "border-sky-500/35"
          : "border-fuchsia-500/30",
      )}
      title={`${p.name} · ${slot}`}
    >
      <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">
        {p.name}
      </span>
      <div className="flex shrink-0 flex-col items-end justify-center leading-none">
        <span className="font-mono text-[9px] font-medium text-muted-foreground">
          {slot}
        </span>
        <span className="text-[9px] text-muted-foreground">
          {p.gender === "MMP" ? "M" : "F"} · {roleShort(p)}
        </span>
      </div>
    </div>
  );
}

export function NextLineCard({
  title,
  kind,
  line,
  roster,
  onUse,
  onEdit,
  onLockRegenerate,
}: {
  title: string;
  kind: keyof typeof tint;
  line: ScoredLine | null;
  roster: Player[];
  onUse: () => void;
  onEdit: () => void;
  onLockRegenerate: () => void;
}) {
  const map = rosterById(roster);
  const slots = line
    ? assignPlayersToSlots(line.playerIds, roster)
    : null;

  return (
    <Card className={cn("flex flex-col py-0", tint[kind])}>
      <CardHeader className="space-y-1 px-2 py-2 pb-1">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <CardTitle className="text-xs font-semibold leading-tight">
              {title}
            </CardTitle>
            {line?.kindLabel && (
              <Badge variant="outline" className="mt-0.5 text-[9px] font-normal">
                {line.kindLabel}
              </Badge>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0 tabular-nums text-[10px]">
            {line ? line.score.toFixed(2) : "—"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-1.5 px-2 pb-2 pt-0 text-sm">
        <div>
          <p className="mb-0.5 text-[9px] font-medium uppercase text-muted-foreground">
            Handlers
          </p>
          <div className="grid grid-cols-3 gap-0.5">
            {slots ? (
              H_SLOTS.map((s) => (
                <MiniCell
                  key={s}
                  slot={s}
                  id={slots[s as SlotId]}
                  map={map}
                />
              ))
            ) : (
              <p className="col-span-3 py-1 text-center text-[10px] text-muted-foreground">
                —
              </p>
            )}
          </div>
        </div>
        <div>
          <p className="mb-0.5 text-[9px] font-medium uppercase text-muted-foreground">
            Cutters
          </p>
          <div className="grid grid-cols-4 gap-0.5">
            {slots ? (
              C_SLOTS.map((s) => (
                <MiniCell
                  key={s}
                  slot={s}
                  id={slots[s as SlotId]}
                  map={map}
                />
              ))
            ) : (
              <p className="col-span-4 py-1 text-center text-[10px] text-muted-foreground">
                —
              </p>
            )}
          </div>
        </div>
        <ul className="min-h-[2rem] space-y-0 text-[10px] text-muted-foreground">
          {(line?.bullets ?? ["—"]).map((b) => (
            <li key={b} className="flex gap-1">
              <span className="text-primary">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {line?.warnings && line.warnings.length > 0 && (
          <div className="rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-950 dark:text-amber-100">
            {line.warnings.slice(0, 2).map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-wrap gap-1 pt-0.5">
          <Button size="sm" className="h-7 flex-1 text-[10px]" onClick={onUse}>
            Use
          </Button>
          <Button size="sm" variant="outline" className="h-7 flex-1 text-[10px]" onClick={onEdit}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 flex-1 text-[10px]"
            onClick={onLockRegenerate}
          >
            Lock
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
