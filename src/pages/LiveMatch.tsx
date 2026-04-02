import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  type SlotId,
} from "@/lib/lineSlotting";
import { replaceIneligibleInLine } from "@/lib/cloneLine";
import { canAddPlayerToLine } from "@/lib/genderQuota";

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
  const setMode = useMatchStore((s) => s.setMode);
  const setStartingGenderPattern = useMatchStore(
    (s) => s.setStartingGenderPattern,
  );
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
    );
    return enrichPlayerRows(base, players);
  }, [players, points, currentPoint, lastIds, scoreUs, scoreThem, mode]);

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
  const [notes, setNotes] = useState("");
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
      notes: notes || undefined,
    });
    setOpen(false);
    setSlots(emptySlots());
    setNotes("");
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
    setNotes("");
    setOpen(false);
    setCompareOpen(false);
    setLlmText(null);
    setLlmErr(null);
    setResetOpen(false);
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="sticky top-0 z-30 -mx-4 border-b border-border/80 bg-background/90 px-4 py-2.5 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/75 md:mx-0 md:rounded-lg md:border md:px-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="tabular-nums text-lg font-bold leading-none">
              {scoreUs}–{scoreThem}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Next pt {currentPoint} · {points.length} logged
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Button type="button" variant="secondary" size="sm" onClick={clearLine}>
              Clear line
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResetOpen(true)}
            >
              Reset match
            </Button>
          </div>
        </div>
      </div>

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

      <section className="rounded-lg border border-border/80 bg-card/30 p-2 shadow-sm sm:p-3">
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
        />
      </section>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[480px]:items-start">
        <section className="space-y-2 rounded-lg border border-border/80 bg-card/30 p-2 shadow-sm sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wide text-foreground sm:text-sm">
              B — Roster (role · gender)
            </h2>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger className={buttonVariants({ size: "sm" })}>
                Confirm point
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Record point {currentPoint}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    Line from slots: {slotsToIds(slots).length}/7
                  </p>
                  <div className="rounded-md border bg-muted/40 p-2 font-mono text-[11px]">
                    {assignPlayersToSlots(slotsToIds(slots), players)
                      ? (() => {
                          const sl = assignPlayersToSlots(
                            slotsToIds(slots),
                            players,
                          )!;
                          return (
                            <div className="grid gap-1">
                              {Object.entries(sl).map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">{k}</span>
                                  <span>{map.get(v)?.name ?? v}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()
                      : slotsToIds(slots).map((id) => map.get(id)?.name).join(", ")}
                  </div>
                  <div className="space-y-1">
                    <Label>Result</Label>
                    <RadioGroup
                      value={result}
                      onValueChange={(v) => setResult(v as PointResult)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="scored" id="scored" />
                        <Label htmlFor="scored">We win point</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="conceded" id="conceded" />
                        <Label htmlFor="conceded">They win</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
                <DialogFooter>
                  <Button
                    disabled={slotsToIds(slots).length !== 7}
                    onClick={() => submitPoint()}
                  >
                    Save point
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <GroupedPlayerBuckets
            rows={enriched}
            selectedIds={selectedSet}
            onPlayerClick={handlePlacePlayer}
            pointsRecorded={points.length}
            isPickable={isPickable}
          />
        </section>

        <section className="space-y-2 rounded-lg border border-border/80 bg-card/30 p-2 shadow-sm sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wide text-foreground sm:text-sm">
              C — Point matrix
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
          <div className="max-h-[min(52vh,420px)] overflow-y-auto min-[480px]:max-h-none min-[480px]:overflow-visible">
            <LineupMatrix
              points={points}
              roster={players}
              highlightPointNumber={matrixSelectedPoint?.pointNumber}
              onRowClick={(pt) => setMatrixSelectedPoint(pt)}
            />
          </div>
          {matrixSelectedPoint && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-2 py-2 text-[11px] sm:px-3 sm:text-xs">
              <span className="font-medium">
                Point {matrixSelectedPoint.pointNumber}{" "}
                <span className="tabular-nums text-muted-foreground">
                  ({matrixSelectedPoint.scoreUs}–{matrixSelectedPoint.scoreThem})
                </span>
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => applyLine(matrixSelectedPoint.players)}
              >
                Load line
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => cloneWithReplace(matrixSelectedPoint)}
              >
                Clone + replace ineligible
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCompareOpen(true)}
              >
                Compare lines
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMatrixSelectedPoint(null)}
              >
                Clear
              </Button>
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Live match
          </h1>
          <p className="text-sm text-muted-foreground">
            Spreadsheet history · next line · rotation buckets
          </p>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-2">
            <span className="text-[11px] text-muted-foreground">Points logged</span>
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-2xl font-bold tabular-nums leading-none text-primary">
              {points.length}
            </span>
            <span className="text-[11px] text-muted-foreground">
              (next: pt {currentPoint})
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => loadExample()}>
            Example
          </Button>
          <Button variant="outline" size="sm" onClick={() => undoLastPoint()}>
            Undo
          </Button>
        </div>
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
              className="w-full"
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
  );
}
