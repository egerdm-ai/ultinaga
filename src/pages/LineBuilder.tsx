import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRosterStore } from "@/store/useRosterStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { validateFullLine, type LineValidationContext } from "@/lib/rules";
import {
  scoreLineComposite,
  type ScoreContext,
} from "@/lib/scoring";
import type { GenderPattern, PointSide } from "@/types/models";

export function LineBuilder() {
  const players = useRosterStore((s) => s.players);
  const teamRules = useSettingsStore((s) => s.teamRules);
  const [side, setSide] = useState<PointSide>("O");
  const [genderPattern, setGenderPattern] = useState<GenderPattern>("4M3F");
  const [slots, setSlots] = useState<(string | null)[]>(
    () => Array.from({ length: 7 }, () => null),
  );

  const lineIds = useMemo(
    () => slots.filter((x): x is string => x !== null),
    [slots],
  );

  const lineCtx: LineValidationContext = useMemo(
    () => ({
      roster: players,
      genderPattern,
      side,
      teamRules,
    }),
    [players, genderPattern, side, teamRules],
  );

  const validation = useMemo(() => {
    if (lineIds.length !== 7) {
      return { ok: false as const, errors: ["Select 7 players."] };
    }
    return validateFullLine(lineIds, [], lineCtx);
  }, [lineIds, lineCtx]);

  const scoreCtx: ScoreContext = useMemo(
    () => ({
      roster: players,
      points: [],
      currentPointNumber: 1,
      scoreUs: 8,
      scoreThem: 8,
      side,
      genderPattern,
      mode: "close",
      teamRules,
    }),
    [players, side, genderPattern, teamRules],
  );

  const strength = useMemo(() => {
    if (!validation.ok || lineIds.length !== 7) return null;
    return scoreLineComposite(lineIds, scoreCtx);
  }, [validation.ok, lineIds, scoreCtx]);

  const add = (id: string) => {
    setSlots((s) => {
      const idx = s.findIndex((x) => x === null);
      if (idx === -1) return s;
      const next = [...s];
      next[idx] = id;
      return next;
    });
  };

  const clear = () => setSlots(Array.from({ length: 7 }, () => null));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Line builder</h1>
        <p className="text-muted-foreground">
          Click players to fill seven slots. Legality uses the same rules as live
          match (no previous-point constraint here).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Context</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Side</Label>
                <Select
                  value={side}
                  onValueChange={(v) => setSide(v as PointSide)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="O">Offense</SelectItem>
                    <SelectItem value="D">Defense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Ratio</Label>
                <Select
                  value={genderPattern}
                  onValueChange={(v) => setGenderPattern(v as GenderPattern)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4M3F">4M — 3F</SelectItem>
                    <SelectItem value="4F3M">4F — 3M</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" onClick={clear}>
              Clear slots
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line slots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-7 gap-2">
              {slots.map((id, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setSlots((s) => {
                      const n = [...s];
                      n[i] = null;
                      return n;
                    })
                  }
                  className="flex min-h-14 flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/40 p-1 text-center text-xs"
                >
                  {id ? (
                    <span className="font-medium">
                      {players.find((p) => p.id === id)?.name ?? id}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{i + 1}</span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster (click to add)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {players.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => add(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Validation & strength</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            {validation.ok ? (
              <Badge className="bg-emerald-600">Valid</Badge>
            ) : (
              <Badge variant="destructive">Invalid</Badge>
            )}
          </div>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            {validation.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {strength && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Composite</span>
                <div className="text-lg font-semibold tabular-nums">
                  {strength.total.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">O/D fit (component)</span>
                <div className="tabular-nums">{strength.odFit.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Close-game clutch</span>
                <div className="tabular-nums">{strength.clutch.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Defense / cutters</span>
                <div className="tabular-nums">
                  D {strength.defense.toFixed(2)} · C {strength.cutterImpact.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
