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
      <button
        key={slot}
        type="button"
        onClick={() => onSlotClick(slot)}
        className={cn(
          "flex min-h-[38px] w-full items-center gap-1.5 rounded border bg-background px-1.5 py-1 text-left transition-colors",
          active
            ? "border-violet-500 ring-1 ring-violet-500/40"
            : "border-border hover:bg-muted/50",
          p ? "" : "border-dashed border-muted-foreground/35",
        )}
        title={p && warn ? `${p.name} — ${warn}` : p ? p.name : slot}
      >
        {p ? (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">
              {p.name}
            </span>
            <div className="flex shrink-0 flex-col items-end justify-center gap-0 leading-none">
              <span className="font-mono text-[9px] font-medium text-muted-foreground">
                {slot}
              </span>
              <span className="text-[9px] text-muted-foreground">
                {p.gender === "MMP" ? "M" : "F"} · {roleShort(p)}
              </span>
            </div>
            <button
              type="button"
              className="shrink-0 rounded px-0.5 text-sm leading-none text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(slot);
              }}
              aria-label="Remove"
            >
              ×
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-[10px] text-muted-foreground">—</span>
            <span className="font-mono text-[9px] text-muted-foreground">{slot}</span>
          </>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-1.5 rounded-md border border-dashed border-border bg-muted/30 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Next line
          </span>
          <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
            <span
              className={cn(
                "inline-flex items-baseline gap-1.5 rounded-md border px-2 py-0.5 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl",
                nextSide === "D"
                  ? "border-blue-600/40 bg-blue-600/15 text-blue-950 dark:text-blue-100"
                  : "border-orange-600/40 bg-orange-600/15 text-orange-950 dark:text-orange-100",
              )}
              title={`Next point: ${nextSide === "O" ? "Offense" : "Defense"}`}
            >
              <span>{odLabel}</span>
              <span className="text-xs font-medium normal-case opacity-90">
                {odSub}
              </span>
            </span>
            <span
              className="text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl"
              title="Gender ratio for this point"
            >
              {ratioLabel}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 text-[10px]">
          <Badge variant={legality.ok ? "default" : "secondary"} className="h-5 px-1.5 text-[10px]">
            {legality.ok ? "Legal" : "Incomplete"}
          </Badge>
          {quality && (
            <Badge variant="outline" className="h-5 tabular-nums text-[10px]">
              Q {quality.total.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] text-muted-foreground">Handlers</p>
        <div className="grid grid-cols-3 gap-1">
          {(["H1", "H2", "H3"] as const).map((s) => cell(s))}
        </div>
        <p className="text-[9px] text-muted-foreground">Cutters</p>
        <div className="grid grid-cols-4 gap-1">
          {(["C1", "C2", "C3", "C4"] as const).map((s) => cell(s))}
        </div>
      </div>
      {!legality.ok && (
        <ul className="text-[10px] text-destructive">
          {legality.errors.slice(0, 3).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
