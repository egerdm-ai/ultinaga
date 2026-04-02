import type { MatchPoint, Player } from "@/types/models";
import { rosterById } from "@/lib/playerStats";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PreviousPointsStrip({
  points,
  roster,
  max = 6,
}: {
  points: MatchPoint[];
  roster: Player[];
  max?: number;
}) {
  const map = rosterById(roster);
  const sorted = [...points].sort((a, b) => b.pointNumber - a.pointNumber);
  const slice = sorted.slice(0, max);

  if (slice.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No points recorded yet.</p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {slice.map((p) => (
        <div
          key={p.pointNumber}
          className={cn(
            "flex min-w-[200px] shrink-0 flex-col gap-1 rounded-lg border p-2 text-xs shadow-sm",
            p.result === "scored"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-red-500/25 bg-red-500/5",
          )}
        >
          <div className="flex items-center justify-between gap-1 font-semibold">
            <span>#{p.pointNumber}</span>
            <span className="tabular-nums text-muted-foreground">
              {p.scoreUs}–{p.scoreThem}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="h-5 px-1 text-[10px]">
              {p.side}
            </Badge>
            <Badge variant="secondary" className="h-5 px-1 text-[10px]">
              {p.genderPattern === "4M3F" ? "4M-3F" : "4F-3M"}
            </Badge>
            <Badge
              variant={p.result === "scored" ? "default" : "destructive"}
              className="h-5 px-1 text-[10px]"
            >
              {p.result === "scored" ? "hold" : "broken"}
            </Badge>
          </div>
          <div className="leading-snug text-[11px] text-muted-foreground">
            {p.players.map((id) => map.get(id)?.name ?? id).join(" · ")}
          </div>
        </div>
      ))}
    </div>
  );
}
