import type { MatchPoint, Player } from "@/types/models";
import { rosterById } from "@/lib/playerStats";
import { assignPlayersToSlots, SLOT_ORDER } from "@/lib/lineSlotting";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function NameCell({ id, roster }: { id: string; roster: Player[] }) {
  const map = rosterById(roster);
  const p = map.get(id);
  if (!p) return <span className="text-muted-foreground">{id}</span>;
  const handlerLean =
    p.primaryRole === "handler" ||
    (p.primaryRole === "hybrid" && p.handlerReliability >= p.cutterImpact);
  return (
    <span
      className={cn(
        "inline-block max-w-[88px] truncate rounded px-1 py-0.5 text-[11px] leading-tight",
        p.gender === "MMP"
          ? "bg-sky-500/20 text-sky-950 dark:text-sky-100"
          : "bg-fuchsia-500/15 text-fuchsia-950 dark:text-fuchsia-100",
        handlerLean
          ? "ring-1 ring-amber-500/40"
          : "ring-1 ring-emerald-500/30",
      )}
      title={`${p.name} · ${p.primaryRole} · ${p.gender}`}
    >
      {p.name}
    </span>
  );
}

export function LineupMatrix({
  points,
  roster,
  highlightPointNumber,
  onRowClick,
}: {
  points: MatchPoint[];
  roster: Player[];
  highlightPointNumber?: number;
  onRowClick?: (point: MatchPoint) => void;
}) {
  const sorted = [...points].sort((a, b) => b.pointNumber - a.pointNumber);

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="sticky left-0 z-10 min-w-[44px] bg-muted/50 text-[10px] font-semibold">
              #
            </TableHead>
            <TableHead className="min-w-[52px] text-[10px]">Score</TableHead>
            <TableHead className="w-8 text-[10px]">O/D</TableHead>
            <TableHead className="w-14 text-[10px]">Ratio</TableHead>
            {SLOT_ORDER.map((s) => (
              <TableHead key={s} className="min-w-[76px] text-[10px]">
                {s}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((pt) => {
            const slots = assignPlayersToSlots(pt.players, roster);
            const active = highlightPointNumber === pt.pointNumber;
            return (
              <TableRow
                key={pt.pointNumber}
                className={cn(
                  "group cursor-pointer text-[11px]",
                  active && "bg-violet-500/15 ring-1 ring-violet-500/40",
                  pt.result === "scored"
                    ? "hover:bg-emerald-500/10"
                    : "hover:bg-red-500/10",
                )}
                onClick={() => onRowClick?.(pt)}
              >
                <TableCell className="sticky left-0 z-10 bg-background font-mono font-semibold group-hover:bg-muted/40">
                  {pt.pointNumber}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {pt.scoreUs}–{pt.scoreThem}
                </TableCell>
                <TableCell>{pt.side}</TableCell>
                <TableCell>
                  {pt.genderPattern === "4M3F" ? "4M3F" : "4F3M"}
                </TableCell>
                {slots ? (
                  SLOT_ORDER.map((s) => (
                    <TableCell key={s} className="p-1 align-top">
                      <NameCell id={slots[s]} roster={roster} />
                    </TableCell>
                  ))
                ) : (
                  <TableCell colSpan={7} className="text-destructive">
                    Invalid line
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {sorted.length === 0 && (
        <p className="p-4 text-center text-xs text-muted-foreground">
          No points yet — confirm a line to build history.
        </p>
      )}
    </div>
  );
}
