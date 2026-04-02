import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  GenderPattern,
  GameMode,
  Player,
  PointSide,
} from "@/types/models";
import { SelectedLineStrip } from "@/components/live/SelectedLineStrip";
import type { LineValidationContext } from "@/lib/rules";
import type { ScoreContext } from "@/lib/scoring";
import { sortCandidatesForSlot, type SlotId } from "@/lib/lineSlotting";
import { rosterById } from "@/lib/playerStats";
import { cn } from "@/lib/utils";

export function NextPointBuilder({
  currentPoint,
  scoreUs,
  scoreThem,
  nextSide,
  nextGenderPattern,
  mode,
  roster,
  lineCtx,
  scoreCtx,
  lastPointPlayerIds,
  eligibleIds,
  slots,
  activeSlot,
  onSlotClick,
  onRemoveSlot,
  onClear,
  onPlacePlayer,
  isPickable,
}: {
  currentPoint: number;
  scoreUs: number;
  scoreThem: number;
  nextSide: PointSide;
  nextGenderPattern: GenderPattern;
  mode: GameMode;
  roster: Player[];
  lineCtx: LineValidationContext;
  scoreCtx: ScoreContext;
  lastPointPlayerIds: string[];
  eligibleIds: string[];
  slots: Record<SlotId, string | null>;
  activeSlot: SlotId | null;
  onSlotClick: (s: SlotId) => void;
  onRemoveSlot: (s: SlotId) => void;
  onClear: () => void;
  onPlacePlayer: (playerId: string) => void;
  isPickable: (playerId: string) => boolean;
}) {
  const cand =
    activeSlot && eligibleIds.length
      ? sortCandidatesForSlot(eligibleIds, roster, activeSlot).slice(0, 14)
      : [];

  const map = rosterById(roster);

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Next line
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
            <Badge variant="outline" className="h-5 tabular-nums text-[10px]">
              Pt {currentPoint}
            </Badge>
            <span className="font-semibold tabular-nums">
              {scoreUs} — {scoreThem}
            </span>
            <Badge
              className={cn(
                "h-5 text-[10px]",
                nextSide === "D"
                  ? "border-blue-600/50 bg-blue-600/20 text-blue-950 dark:text-blue-100"
                  : "border-orange-600/50 bg-orange-600/15 text-orange-950 dark:text-orange-100",
              )}
            >
              {nextSide === "O" ? "O offense" : "D defense"}
            </Badge>
            <Badge variant="outline" className="h-5 capitalize text-[10px]">
              {mode}
            </Badge>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px]"
          onClick={onClear}
          title="Clear all slots for this point"
        >
          Clear line
        </Button>
      </div>

      <SelectedLineStrip
        slots={slots}
        activeSlot={activeSlot}
        onSlotClick={onSlotClick}
        onRemove={onRemoveSlot}
        roster={roster}
        lineCtx={lineCtx}
        scoreCtx={scoreCtx}
        lastPointPlayerIds={lastPointPlayerIds}
        genderPattern={nextGenderPattern}
        nextSide={nextSide}
      />

      {activeSlot && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="py-2 pb-1">
            <CardTitle className="text-xs font-medium">
              Slot assist · {activeSlot}{" "}
              <span className="font-normal text-muted-foreground">
                (tap to place)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1 pb-3 pt-0">
            {cand.map((id) => {
              const p = map.get(id);
              if (!p) return null;
              const inLine = Object.values(slots).includes(id);
              const ok = isPickable(id);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!ok}
                  title={!ok ? "Gender quota full for this ratio" : undefined}
                  onClick={() => ok && onPlacePlayer(id)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] transition-colors",
                    !ok && "cursor-not-allowed opacity-40",
                    inLine && ok
                      ? "border-violet-500 bg-violet-500/20"
                      : ok
                        ? "border-border bg-background hover:bg-muted"
                        : "border-border bg-muted/50",
                  )}
                >
                  {p.name}
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
