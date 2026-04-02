import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMatchStore } from "@/store/useMatchStore";
import { useRosterStore } from "@/store/useRosterStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useRecommendation } from "@/hooks/useRecommendation";
import { getLastPointPlayerIds } from "@/lib/playerStats";
import { buildPlayerRows } from "@/lib/analytics";
import { enrichPlayerRows } from "@/lib/playerBuckets";
import { fetchCoachInsight } from "@/lib/llm";
import type { PointResult } from "@/types/models";
import type { GenderPattern } from "@/types/models";
import type { MatchPoint } from "@/types/models";
import { NextPointBuilder } from "@/components/live/NextPointBuilder";
import { LineupMatrix } from "@/components/live/LineupMatrix";
import { GroupedPlayerBuckets } from "@/components/live/GroupedPlayerBuckets";
import { buildCoachPills } from "@/lib/matchInsights";
import type { LineValidationContext } from "@/lib/rules";
import type { ScoreContext } from "@/lib/scoring";
import { rosterById } from "@/lib/playerStats";
import {
  emptySlots,
  idsToSlots,
  slotsToIds,
  addPlayerToSlots,
  assignPlayersToSlots,
  SLOT_ORDER,
  type SlotId,
} from "@/lib/lineSlotting";
import { replaceIneligibleInLine } from "@/lib/cloneLine";
import { canAddPlayerToLine } from "@/lib/genderQuota";
import { cn } from "@/lib/utils";

export function LiveMatch() {
  const players = useRosterStore((s) => s.players);
  const teamRules = useSettingsStore((s) => s.teamRules);
  const points = useMatchStore((s) => s.points);
  const scoreUs = useMatchStore((s) => s.scoreUs);
  const scoreThem = useMatchStore((s) => s.scoreThem);
  const mode = useMatchStore((s) => s.mode);
  const opponent = useMatchStore((s) => s.opponent);
  const nextSide = useMatchStore((s) => s.nextSide);
  const nextGenderPattern = useMatchStore((s) => s.nextGenderPattern);
  const startingGenderPattern = useMatchStore((s) => s.startingGenderPattern);
  const startingSide = useMatchStore((s) => s.startingSide);
  const setMode = useMatchStore((s) => s.setMode);
  const setStartingGenderPattern = useMatchStore(
    (s) => s.setStartingGenderPattern,
  );
  const setStartingSide = useMatchStore((s) => s.setStartingSide);
  const bumpScore = useMatchStore((s) => s.bumpScore);
  const confirmPoint = useMatchStore((s) => s.confirmPoint);
  const undoLastPoint = useMatchStore((s) => s.undoLastPoint);
  const loadExample = useMatchStore((s) => s.loadExampleMatch);
  const startNewMatch = useMatchStore((s) => s.startNewMatch);
  const setOpponent = useMatchStore((s) => s.setOpponent);

  const rec = useRecommendation();

  const currentPoint =
    points.length === 0 ? 1 : Math.max(...points.map((p) => p.pointNumber)) + 1;
  const lastIds = getLastPointPlayerIds(points);

  const [slots, setSlots] = useState<Record<SlotId, string | null>>(() =>
    emptySlots(),
  );
  const [activeSlot, setActiveSlot] = useState<SlotId | null>(null);
  const [matrixSelectedPoint, setMatrixSelectedPoint] =
    useState<MatchPoint | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const lineCtx: LineValidationContext = useMemo(
    () => ({
      roster: players,
      genderPattern: nextGenderPattern,
      side: nextSide,
      teamRules,
    }),
    [players, nextGenderPattern, nextSide, teamRules],
  );

  const scoreCtx: ScoreContext = useMemo(
    () => ({
      roster: players,
      points,
      currentPointNumber: currentPoint,
      scoreUs,
      scoreThem,
      side: nextSide,
      genderPattern: nextGenderPattern,
      mode,
      teamRules,
    }),
    [
      players,
      points,
      currentPoint,
      scoreUs,
      scoreThem,
      nextSide,
      nextGenderPattern,
      mode,
      teamRules,
    ],
  );

  const enriched = useMemo(() => {
    const base = buildPlayerRows(
      players,
      points,
      currentPoint,
      lastIds,
      scoreUs,
      scoreThem,
      mode,
      teamRules.exemptConsecutivePlayIds ?? [],
    );
    return enrichPlayerRows(base, players);
  }, [
    players,
    points,
    currentPoint,
    lastIds,
    scoreUs,
    scoreThem,
    mode,
    teamRules.exemptConsecutivePlayIds,
  ]);

  const fillerPriority = useMemo(
    () =>
      [...enriched]
        .sort((a, b) => b.urgency - a.urgency)
        .map((r) => r.player.id),
    [enriched],
  );

  const pills = useMemo(
    () =>
      buildCoachPills(
        players,
        points,
        currentPoint,
        lastIds,
        scoreUs,
        scoreThem,
        mode,
        nextSide,
      ),
    [
      players,
      points,
      currentPoint,
      lastIds,
      scoreUs,
      scoreThem,
      mode,
      nextSide,
    ],
  );

  const extraPills = useMemo(() => {
    const underBucket = enriched
      .filter((e) => e.relative.vsGroup === "below")
      .map((e) => e.player.name)
      .slice(0, 5);
    const longest = enriched
      .filter((e) => e.eligibleNext)
      .sort((a, b) => b.since - a.since)
      .slice(0, 4)
      .map((e) => `${e.player.name} (${e.since})`);
    const out: { id: string; label: string; names: string[] }[] = [];
    if (underBucket.length) {
      out.push({
        id: "under-bucket",
        label: "Under group avg",
        names: underBucket,
      });
    }
    if (longest.length) {
      out.push({
        id: "long-elig",
        label: "Longest rested (eligible)",
        names: longest,
      });
    }
    return out;
  }, [enriched]);

  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<PointResult>("scored");
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmText, setLlmText] = useState<string | null>(null);
  const [llmErr, setLlmErr] = useState<string | null>(null);

  const eligibleIds = rec.eligiblePlayerIds;
  const map = rosterById(players);
  const selectedSet = useMemo(
    () => new Set(slotsToIds(slots)),
    [slots],
  );

  const applyLine = (ids: string[]) => {
    setSlots(idsToSlots(ids, players));
  };

  const isPickable = useCallback(
    (id: string) =>
      eligibleIds.includes(id) &&
      canAddPlayerToLine(slots, id, activeSlot, players, nextGenderPattern),
    [eligibleIds, slots, activeSlot, players, nextGenderPattern],
  );

  const handlePlacePlayer = (id: string) => {
    if (!isPickable(id)) return;
    setSlots((s) => addPlayerToSlots(s, id, activeSlot));
  };

  const removeSlot = (slot: SlotId) => {
    setSlots((prev) => ({ ...prev, [slot]: null }));
  };

  const submitPoint = () => {
    const line = slotsToIds(slots);
    if (line.length !== 7) return;
    let nextUs = scoreUs;
    let nextThem = scoreThem;
    // O/D is which side we played; score goes to the winning team only
    if (result === "scored") {
      nextUs++;
    } else {
      nextThem++;
    }
    confirmPoint({
      players: line,
      result,
      scoreUs: nextUs,
      scoreThem: nextThem,
    });
    setOpen(false);
    setSlots(emptySlots());
    setActiveSlot(null);
  };

  const cloneWithReplace = (pt: MatchPoint) => {
    const out = replaceIneligibleInLine(
      pt.players,
      lastIds,
      eligibleIds,
      fillerPriority,
    );
    if (out.length === 7) {
      applyLine(out);
      return;
    }
  };

  const runLlm = async () => {
    setLlmLoading(true);
    setLlmErr(null);
    setLlmText(null);
    try {
      const out = await fetchCoachInsight({
        opponent,
        scoreUs,
        scoreThem,
        mode,
        nextSide,
        nextGenderPattern,
        points,
        roster: players,
        teamRules,
        recommendations: {
          best: null,
          rotationSafe: null,
          mustPlayPressure: null,
        },
      });
      setLlmText(
        [out.explanation, out.underplayedWarnings, out.coachingAdvice]
          .filter(Boolean)
          .join("\n\n"),
      );
    } catch (e) {
      setLlmErr(e instanceof Error ? e.message : "Coach API unavailable.");
    } finally {
      setLlmLoading(false);
    }
  };

  const compareNames = (ids: string[]) =>
    ids.map((id) => map.get(id)?.name ?? id).join(", ");

  const clearLine = () => {
    setSlots(emptySlots());
    setActiveSlot(null);
  };

  const resetEntireMatch = () => {
    startNewMatch();
    setSlots(emptySlots());
    setActiveSlot(null);
    setMatrixSelectedPoint(null);
    setOpen(false);
    setCompareOpen(false);
    setLlmText(null);
    setLlmErr(null);
    setResetOpen(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="sticky top-0 z-40 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-background/95 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md supports-[backdrop-filter]:bg-background/90">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Ultinaga
          </span>
          <span className="text-2xl font-black tabular-nums leading-none tracking-tight">
            {scoreUs}
            <span className="text-muted-foreground/70">–</span>
            {scoreThem}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Pt {currentPoint} · {points.length} logged
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 touch-manipulation px-2.5 text-xs"
            onClick={clearLine}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 touch-manipulation px-2.5 text-xs"
            onClick={() => setResetOpen(true)}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 touch-manipulation px-2 text-xs"
            onClick={() => undoLastPoint()}
          >
            Undo
          </Button>
        </div>
      </header>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset entire match?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Clears score, all recorded points, and the line builder. This cannot be
            undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={resetEntireMatch}>
              Reset match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden landscape:flex-row">
        <section className="flex min-h-0 flex-[1_1_42%] flex-col overflow-y-auto border-b border-border/70 bg-gradient-to-b from-violet-500/[0.07] to-background p-2 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.06)] landscape:flex-[0_0_min(42vw,21rem)] landscape:max-w-[21rem] landscape:border-b-0 landscape:border-r landscape:p-3">
          <NextPointBuilder
            currentPoint={currentPoint}
            scoreUs={scoreUs}
            scoreThem={scoreThem}
            nextSide={nextSide}
            nextGenderPattern={nextGenderPattern}
            mode={mode}
            roster={players}
            lineCtx={lineCtx}
            scoreCtx={scoreCtx}
            lastPointPlayerIds={lastIds}
            eligibleIds={eligibleIds}
            slots={slots}
            activeSlot={activeSlot}
            onSlotClick={(s) => setActiveSlot((prev) => (prev === s ? null : s))}
            onRemoveSlot={removeSlot}
            onClear={clearLine}
            onPlacePlayer={handlePlacePlayer}
            isPickable={isPickable}
            pointsRecorded={points.length}
            startingGenderPattern={startingGenderPattern}
            onStartingGenderPatternChange={setStartingGenderPattern}
            startingSide={startingSide}
            onStartingSideChange={setStartingSide}
            onConfirmPointClick={() => setOpen(true)}
          />
        </section>

        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gradient-to-br from-emerald-500/[0.06] to-background p-2 landscape:min-w-0 landscape:p-3">
          <h2 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-emerald-900 dark:text-emerald-100">
            Roster · pick
          </h2>
          <GroupedPlayerBuckets
            rows={enriched}
            selectedIds={selectedSet}
            onPlayerClick={handlePlacePlayer}
            pointsRecorded={points.length}
            isPickable={isPickable}
            lastPointPlayerIds={lastIds}
            exemptConsecutivePlayIds={teamRules.exemptConsecutivePlayIds ?? []}
          />
        </section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="max-h-[min(92vh,720px)] gap-3 overflow-y-auto border-2 p-3 sm:max-w-2xl sm:p-4 landscape:max-h-[min(88vh,400px)] landscape:gap-2 landscape:p-3 landscape:sm:max-w-[min(96vw,44rem)]"
        >
          <DialogHeader className="space-y-0.5 pr-8 landscape:space-y-0">
            <DialogTitle className="text-left text-lg font-bold tracking-tight sm:text-xl landscape:text-base">
              Point {currentPoint}
            </DialogTitle>
            <p className="text-sm text-muted-foreground landscape:text-xs">
              Line complete: {slotsToIds(slots).length}/7 players
            </p>
          </DialogHeader>

          <div className="space-y-3 landscape:space-y-2">
            <div className="rounded-lg border border-border bg-muted/30 p-2 landscape:p-1.5">
              {assignPlayersToSlots(slotsToIds(slots), players)
                ? (() => {
                    const sl = assignPlayersToSlots(
                      slotsToIds(slots),
                      players,
                    )!;
                    return (
                      <div className="flex flex-wrap items-stretch justify-start gap-1.5 landscape:gap-1">
                        {SLOT_ORDER.map((slot) => (
                          <div
                            key={slot}
                            className="flex min-w-0 items-center gap-1.5 rounded-md border border-border/80 bg-background/80 px-2 py-1 text-xs landscape:gap-1 landscape:px-1.5 landscape:py-0.5 landscape:text-[11px]"
                          >
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground landscape:text-[9px]">
                              {slot}
                            </span>
                            <span className="min-w-0 truncate font-semibold">
                              {map.get(sl[slot]!)?.name ?? sl[slot]}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                : (
                    <p className="text-xs text-muted-foreground">
                      {slotsToIds(slots)
                        .map((id) => map.get(id)?.name)
                        .join(" · ")}
                    </p>
                  )}
            </div>

            <div className="space-y-2 landscape:space-y-1.5">
              <Label className="text-sm font-semibold landscape:text-xs">
                Who won?
              </Label>
              <RadioGroup
                value={result}
                onValueChange={(v) => setResult(v as PointResult)}
                className="grid grid-cols-2 gap-2 landscape:gap-1.5"
              >
                <label
                  htmlFor="scored"
                  className={cn(
                    "flex cursor-pointer touch-manipulation flex-col items-center gap-1 rounded-xl border-2 p-2.5 transition-colors landscape:p-2",
                    result === "scored"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem
                    value="scored"
                    id="scored"
                    className="size-4 shrink-0 border-2 landscape:size-3.5"
                  />
                  <span className="text-center text-sm font-semibold leading-tight landscape:text-xs">
                    We win
                  </span>
                </label>
                <label
                  htmlFor="conceded"
                  className={cn(
                    "flex cursor-pointer touch-manipulation flex-col items-center gap-1 rounded-xl border-2 p-2.5 transition-colors landscape:p-2",
                    result === "conceded"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem
                    value="conceded"
                    id="conceded"
                    className="size-4 shrink-0 border-2 landscape:size-3.5"
                  />
                  <span className="text-center text-sm font-semibold leading-tight landscape:text-xs">
                    They win
                  </span>
                </label>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="mt-1 border-0 bg-transparent p-0 shadow-none sm:justify-stretch">
            <Button
              type="button"
              className="h-12 w-full touch-manipulation text-base font-semibold landscape:h-11 landscape:text-sm"
              size="lg"
              disabled={slotsToIds(slots).length !== 7}
              onClick={() => submitPoint()}
            >
              Save point
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="border-t-[3px] border-violet-500/40 bg-muted/25 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-10 flex items-center justify-center gap-2 border-b border-border/60 bg-muted/95 px-3 py-2.5 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Point history
          </span>
          <span aria-hidden className="select-none text-muted-foreground/60">
            ↓
          </span>
        </div>

        <div className="mx-auto max-w-6xl space-y-4 px-2 py-4 md:px-4">
          <div className="space-y-2 rounded-xl border border-border/80 bg-card/60 p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-foreground">
                Point matrix
              </h2>
              <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Compare lines</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Selected history point
                      </p>
                      <p>
                        {matrixSelectedPoint
                          ? compareNames(matrixSelectedPoint.players)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Your editor (slots)
                      </p>
                      <p>{compareNames(slotsToIds(slots))}</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCompareOpen(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border/50 bg-background/50">
              <LineupMatrix
                points={points}
                roster={players}
                highlightPointNumber={matrixSelectedPoint?.pointNumber}
                onRowClick={(pt) => setMatrixSelectedPoint(pt)}
              />
            </div>
            {matrixSelectedPoint && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-2 py-2 text-[11px] sm:px-3 sm:text-xs">
                <span className="font-medium">
                  Point {matrixSelectedPoint.pointNumber}{" "}
                  <span className="tabular-nums text-muted-foreground">
                    ({matrixSelectedPoint.scoreUs}–{matrixSelectedPoint.scoreThem})
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 touch-manipulation"
                  onClick={() => applyLine(matrixSelectedPoint.players)}
                >
                  Load line
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 touch-manipulation"
                  onClick={() => cloneWithReplace(matrixSelectedPoint)}
                >
                  Clone + replace
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 touch-manipulation"
                  onClick={() => setCompareOpen(true)}
                >
                  Compare
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 touch-manipulation"
                  onClick={() => setMatrixSelectedPoint(null)}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border/60 bg-background/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{points.length}</span> points
              logged · next pt {currentPoint}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 touch-manipulation text-xs"
              onClick={() => loadExample()}
            >
              Load example match
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[...pills, ...extraPills].map((p) => (
              <div
                key={p.id}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-xs shadow-sm"
              >
                <span className="font-medium text-foreground">{p.label}:</span>{" "}
                <span className="text-muted-foreground">{p.names.join(", ")}</span>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Match &amp; pace</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-sm">
                <div className="flex flex-wrap gap-1">
                  <Button variant="outline" size="sm" onClick={() => bumpScore(1, 0)}>
                    Us +1
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => bumpScore(-1, 0)}>
                    Us −1
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => bumpScore(0, 1)}>
                    Them +1
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => bumpScore(0, -1)}>
                    Them −1
                  </Button>
                </div>
                <span className="tabular-nums font-semibold">
                  {scoreUs} — {scoreThem}
                </span>
                <input
                  className="h-8 min-w-[120px] rounded-md border border-input bg-transparent px-2 text-sm"
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  placeholder="Opponent"
                />
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-md border bg-muted/50 px-2 py-1 font-semibold">
                    Next:{" "}
                    <span
                      className={
                        nextSide === "D"
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-orange-700 dark:text-orange-300"
                      }
                    >
                      {nextSide === "O" ? "O (offense)" : "D (defense)"}
                    </span>
                  </span>
                  <span className="rounded-md border bg-muted/50 px-2 py-1 tabular-nums">
                    Ratio: {nextGenderPattern === "4M3F" ? "4M-3F" : "4F-3M"}
                  </span>
                  {points.length === 0 ? (
                    <Select
                      value={startingGenderPattern}
                      onValueChange={(v) =>
                        setStartingGenderPattern(v as GenderPattern)
                      }
                    >
                      <SelectTrigger className="h-8 w-[200px] text-xs">
                        <SelectValue placeholder="First point ratio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4M3F">First point: 4M-3F (ABBA)</SelectItem>
                        <SelectItem value="4F3M">First point: 4F-3M (ABBA)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground" title="A-B-B-A repeats">
                      ABBA start:{" "}
                      {startingGenderPattern === "4M3F" ? "4M-3F" : "4F-3M"}
                    </span>
                  )}
                </div>
                <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                  <SelectTrigger className="h-8 w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="close">Close</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="blowout">Blowout</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">AI coach</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full touch-manipulation"
                  variant="secondary"
                  size="sm"
                  disabled={llmLoading}
                  onClick={() => void runLlm()}
                >
                  {llmLoading ? "…" : "Explain"}
                </Button>
                {llmErr && <p className="text-xs text-destructive">{llmErr}</p>}
                {llmText && (
                  <p className="max-h-28 overflow-y-auto text-xs text-muted-foreground whitespace-pre-wrap">
                    {llmText}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
