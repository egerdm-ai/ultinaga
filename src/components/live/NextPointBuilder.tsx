import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  GenderPattern,
  GameMode,
  Player,
  PointSide,
} from "@/types/models";
import { SelectedLineStrip } from "@/components/live/SelectedLineStrip";
import type { LineValidationContext } from "@/lib/rules";
import type { ScoreContext } from "@/lib/scoring";
import {
  sortCandidatesForSlot,
  slotsToIds,
  type SlotId,
} from "@/lib/lineSlotting";
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
  pointsRecorded,
  startingGenderPattern,
  onStartingGenderPatternChange,
  startingSide,
  onStartingSideChange,
  onConfirmPointClick,
}: {
  currentPoint: number;
  scoreUs: number;
  scoreThem: number;
  nextSide: PointSide;
  nextGenderPattern: GenderPattern;
  mode: GameMode;
  roster: Player[];
  pointsRecorded: number;
  startingGenderPattern: GenderPattern;
  onStartingGenderPatternChange: (g: GenderPattern) => void;
  startingSide: PointSide;
  onStartingSideChange: (s: PointSide) => void;
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
  onConfirmPointClick: () => void;
}) {
  const lineComplete = slotsToIds(slots).length === 7;

  const cand =
    activeSlot && eligibleIds.length
      ? sortCandidatesForSlot(eligibleIds, roster, activeSlot).slice(0, 14)
      : [];

  const map = rosterById(roster);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
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
          className="h-8 touch-manipulation text-[11px]"
          onClick={onClear}
          title="Clear all slots for this point"
        >
          Clear line
        </Button>
      </div>

      {pointsRecorded === 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-amber-500/35 bg-amber-500/[0.06] px-2 py-1.5">
          <div className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-amber-950/90 dark:text-amber-100/90">
              Start on (point 1)
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={startingSide === "O" ? "default" : "outline"}
                size="sm"
                className="h-8 flex-1 touch-manipulation text-[11px] font-semibold"
                onClick={() => onStartingSideChange("O")}
              >
                O offense
              </Button>
              <Button
                type="button"
                variant={startingSide === "D" ? "default" : "outline"}
                size="sm"
                className="h-8 flex-1 touch-manipulation text-[11px] font-semibold"
                onClick={() => onStartingSideChange("D")}
              >
                D defense
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="start-ratio"
              className="text-[10px] font-medium uppercase tracking-wide text-amber-950/90 dark:text-amber-100/90"
            >
              First point ratio (ABBA)
            </Label>
            <Select
              value={startingGenderPattern}
              onValueChange={(v) => onStartingGenderPatternChange(v as GenderPattern)}
            >
              <SelectTrigger
                id="start-ratio"
                className="h-8 w-full touch-manipulation text-xs font-medium"
              >
                <SelectValue placeholder="Ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4M3F">4M–3F first</SelectItem>
                <SelectItem value="4F3M">4F–3M first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

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
        <Card className="shrink-0 border-violet-500/30 bg-violet-500/5">
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

      <div className="min-h-2 flex-1 shrink" aria-hidden />

      <Button
        type="button"
        className="h-11 min-h-[44px] w-full shrink-0 touch-manipulation px-4 text-sm font-semibold shadow-sm landscape:h-10 landscape:min-h-[44px]"
        disabled={!lineComplete}
        title={
          !lineComplete ? "Select all 7 players to confirm" : "Confirm this line"
        }
        onClick={onConfirmPointClick}
      >
        Confirm point
      </Button>
    </section>
  );
}
