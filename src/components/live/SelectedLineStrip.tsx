import { Badge } from "@/components/ui/badge";
import type { GenderPattern, Player, PointSide } from "@/types/models";
import { rosterById } from "@/lib/playerStats";
import { validateFullLine, type LineValidationContext } from "@/lib/rules";
import { scoreLineComposite, type ScoreContext } from "@/lib/scoring";
import { type SlotId, slotsToIds, slotRoleMismatch } from "@/lib/lineSlotting";
import { cn } from "@/lib/utils";

function roleShort(p: Player): string {
  if (p.primaryRole === "handler") return "han";
  if (p.primaryRole === "cutter") return "cut";
  return "hyb";
}

export function SelectedLineStrip({
  slots,
  activeSlot,
  onSlotClick,
  onRemove,
  roster,
  lineCtx,
  scoreCtx,
  lastPointPlayerIds,
  genderPattern,
  nextSide,
}: {
  slots: Record<SlotId, string | null>;
  activeSlot: SlotId | null;
  onSlotClick: (slot: SlotId) => void;
  onRemove: (slot: SlotId) => void;
  roster: Player[];
  lineCtx: LineValidationContext;
  scoreCtx: ScoreContext;
  lastPointPlayerIds: string[];
  genderPattern: GenderPattern;
  nextSide: PointSide;
}) {
  const map = rosterById(roster);
  const filled = slotsToIds(slots);
  const legality =
    filled.length === 7
      ? validateFullLine(filled, lastPointPlayerIds, lineCtx)
      : { ok: false, errors: ["Select 7 players (H1–C4)."] };
  const quality =
    filled.length === 7 && legality.ok
      ? scoreLineComposite(filled, scoreCtx)
      : null;

  const ratioLabel = genderPattern === "4M3F" ? "4M — 3F" : "4F — 3M";
  const odLabel = nextSide === "O" ? "O" : "D";
  const odSub = nextSide === "O" ? "offense" : "defense";

  const cell = (slot: SlotId) => {
    const id = slots[slot];
    const p = id ? map.get(id) : null;
    const active = activeSlot === slot;
    const warn = id ? slotRoleMismatch(slot, id, roster) : null;
    return (
      <div key={slot} className="flex min-h-[38px] gap-0.5">
        <button
          type="button"
          onClick={() => onSlotClick(slot)}
          className={cn(
            "flex min-h-[38px] min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-md border bg-background px-1.5 py-1 text-left transition-colors",
            active
              ? "border-violet-500 ring-1 ring-violet-500/40"
              : "border-border hover:bg-muted/50",
            p ? "" : "border-dashed border-muted-foreground/35",
          )}
          title={p && warn ? `${p.name} — ${warn}` : p ? p.name : slot}
        >
          {p ? (
            <>
              <span className="line-clamp-2 min-w-0 break-words text-sm font-bold leading-tight text-foreground">
                {p.name}
              </span>
              <div className="flex items-center justify-between gap-1 text-[10px] leading-none text-foreground/75">
                <span className="font-mono font-medium">{slot}</span>
                <span>
                  {p.gender === "MMP" ? "M" : "F"} · {roleShort(p)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex w-full items-center justify-between gap-1">
              <span className="text-[11px] text-muted-foreground">—</span>
              <span className="font-mono text-[10px] text-muted-foreground">{slot}</span>
            </div>
          )}
        </button>
        {p ? (
          <button
            type="button"
            className="shrink-0 self-start rounded px-0.5 text-sm leading-none text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(slot);
            }}
            aria-label={`Remove ${p.name}`}
          >
            ×
          </button>
        ) : (
          <div className="w-5 shrink-0" aria-hidden />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2.5 rounded-lg border border-dashed border-border/80 bg-muted/25 p-2.5 shadow-inner sm:p-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Line
          </span>
          <div className="flex flex-wrap justify-end gap-1 text-[10px]">
            <Badge
              variant={legality.ok ? "default" : "secondary"}
              className="h-6 px-2 text-[10px]"
            >
              {legality.ok ? "Legal" : "Incomplete"}
            </Badge>
            {quality && (
              <Badge variant="outline" className="h-6 tabular-nums text-[10px]">
                Q {quality.total.toFixed(2)}
              </Badge>
            )}
          </div>
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border px-2 py-1.5",
            nextSide === "D"
              ? "border-blue-500/35 bg-blue-500/[0.08]"
              : "border-orange-500/35 bg-orange-500/[0.08]",
          )}
        >
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              nextSide === "D" ? "text-blue-950 dark:text-blue-100" : "text-orange-950 dark:text-orange-100",
            )}
            title={`Next point: ${nextSide === "O" ? "Offense" : "Defense"}`}
          >
            {odLabel}{" "}
            <span className="text-xs font-semibold normal-case opacity-90">{odSub}</span>
          </span>
          <span
            className="text-base font-bold tabular-nums text-foreground"
            title="Gender ratio for this point"
          >
            {ratioLabel}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Handlers
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {(["H1", "H2", "H3"] as const).map((s) => cell(s))}
        </div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Cutters
        </p>
        <div className="grid grid-cols-4 gap-1">
          {(["C1", "C2", "C3", "C4"] as const).map((s) => cell(s))}
        </div>
      </div>
      {!legality.ok && (
        <ul className="space-y-0.5 text-[11px] leading-snug text-destructive">
          {legality.errors.slice(0, 3).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
