import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  GameMode,
  GenderPattern,
  LineTemplate,
  MatchPoint,
  PointResult,
  PointSide,
} from "@/types/models";
import { SEED_LINE_TEMPLATES } from "@/data/seedLineTemplates";
import {
  SEED_EXAMPLE_OPPONENT,
  SEED_EXAMPLE_POINTS,
} from "@/data/seedExampleMatch";
import { getLastPointPlayerIds } from "@/lib/playerStats";
import {
  nextGenderPatternAfterPoints,
  nextSideAfterPoints,
} from "@/lib/matchFlow";

function newMatchId(): string {
  return `match-${Date.now().toString(36)}`;
}

interface MatchState {
  matchId: string;
  opponent: string;
  mode: GameMode;
  targetMinPointsDefault: number;
  points: MatchPoint[];
  savedLines: LineTemplate[];
  scoreUs: number;
  scoreThem: number;
  nextSide: PointSide;
  nextGenderPattern: GenderPattern;
  /** İlk sayı / maç başı oran; ABBA döngüsü buna göre (sadece bunu seçersin). */
  startingGenderPattern: GenderPattern;
  /** Maçın ilk sayısında O mu D mi (pull / savunma). */
  startingSide: PointSide;

  setOpponent: (o: string) => void;
  setMode: (m: GameMode) => void;
  /** O/D ve sıradaki oran skordan + ABBA ile güncellenir; manuel için (ileri). */
  setNextSide: (s: PointSide) => void;
  setNextGenderPattern: (g: GenderPattern) => void;
  setStartingGenderPattern: (g: GenderPattern) => void;
  setStartingSide: (s: PointSide) => void;
  setScore: (us: number, them: number) => void;
  bumpScore: (usDelta: number, themDelta: number) => void;
  confirmPoint: (payload: {
    players: string[];
    result: PointResult;
    scoreUs: number;
    scoreThem: number;
    notes?: string;
  }) => void;
  undoLastPoint: () => void;
  startNewMatch: () => void;
  loadExampleMatch: () => void;
  setSavedLines: (lines: LineTemplate[]) => void;
  addSavedLine: (line: LineTemplate) => void;
}

export const useMatchStore = create<MatchState>()(
  persist(
    (set, get) => ({
      matchId: newMatchId(),
      opponent: "",
      mode: "balanced",
      targetMinPointsDefault: 4,
      points: [],
      savedLines: SEED_LINE_TEMPLATES,
      scoreUs: 0,
      scoreThem: 0,
      nextSide: "O",
      nextGenderPattern: "4M3F",
      startingGenderPattern: "4M3F",
      startingSide: "O",

      setOpponent: (opponent) => set({ opponent }),
      setMode: (mode) => set({ mode }),
      setNextSide: (nextSide) => set({ nextSide }),
      setNextGenderPattern: (nextGenderPattern) => set({ nextGenderPattern }),
      setStartingGenderPattern: (startingGenderPattern) =>
        set((s) => ({
          startingGenderPattern,
          nextSide: nextSideAfterPoints(s.points, s.startingSide),
          nextGenderPattern: nextGenderPatternAfterPoints(
            s.points,
            startingGenderPattern,
          ),
        })),
      setStartingSide: (startingSide) =>
        set((s) => ({
          startingSide,
          ...(s.points.length === 0 ? { nextSide: startingSide } : {}),
        })),
      setScore: (scoreUs, scoreThem) => set({ scoreUs, scoreThem }),

      bumpScore: (usDelta, themDelta) =>
        set((s) => ({
          scoreUs: Math.max(0, s.scoreUs + usDelta),
          scoreThem: Math.max(0, s.scoreThem + themDelta),
        })),

      confirmPoint: (payload) => {
        const state = get();
        const prev = state.points;
        const starting = state.startingGenderPattern;
        const pointNumber =
          prev.length === 0 ? 1 : Math.max(...prev.map((p) => p.pointNumber)) + 1;
        const point: MatchPoint = {
          pointNumber,
          scoreUs: payload.scoreUs,
          scoreThem: payload.scoreThem,
          side: state.nextSide,
          genderPattern: state.nextGenderPattern,
          players: payload.players,
          result: payload.result,
          notes: payload.notes,
        };
        const newPoints = [...prev, point];
        set({
          points: newPoints,
          scoreUs: payload.scoreUs,
          scoreThem: payload.scoreThem,
          nextSide: nextSideAfterPoints(newPoints),
          nextGenderPattern: nextGenderPatternAfterPoints(newPoints, starting),
        });
      },

      undoLastPoint: () => {
        const state = get();
        const prev = state.points;
        if (prev.length === 0) return;
        const next = [...prev].sort((a, b) => a.pointNumber - b.pointNumber);
        next.pop();
        const last = next[next.length - 1];
        const starting = state.startingGenderPattern;
        set({
          points: next,
          scoreUs: last?.scoreUs ?? 0,
          scoreThem: last?.scoreThem ?? 0,
          nextSide: nextSideAfterPoints(next, state.startingSide),
          nextGenderPattern: nextGenderPatternAfterPoints(next, starting),
        });
      },

      startNewMatch: () =>
        set({
          matchId: newMatchId(),
          points: [],
          scoreUs: 0,
          scoreThem: 0,
          startingGenderPattern: "4M3F",
          startingSide: "O",
          nextSide: nextSideAfterPoints([], "O"),
          nextGenderPattern: nextGenderPatternAfterPoints([], "4M3F"),
        }),

      loadExampleMatch: () => {
        const pts = SEED_EXAMPLE_POINTS;
        const starting = pts[0]?.genderPattern ?? "4M3F";
        const kick = pts[0]?.side ?? "O";
        set({
          matchId: newMatchId(),
          opponent: SEED_EXAMPLE_OPPONENT,
          mode: "close",
          points: pts,
          scoreUs: 11,
          scoreThem: 6,
          startingGenderPattern: starting,
          startingSide: kick,
          nextSide: nextSideAfterPoints(pts, kick),
          nextGenderPattern: nextGenderPatternAfterPoints(pts, starting),
        });
      },

      setSavedLines: (savedLines) => set({ savedLines }),
      addSavedLine: (line) =>
        set((s) => ({ savedLines: [...s.savedLines, line] })),
    }),
    {
      name: "ulm-match",
      version: 2,
      migrate: (persistedState: unknown) => {
        const s = persistedState as Partial<MatchState> & {
          points?: MatchPoint[];
        };
        const pts = s.points ?? [];
        const starting =
          s.startingGenderPattern ?? pts[0]?.genderPattern ?? "4M3F";
        const startingSide = s.startingSide ?? pts[0]?.side ?? "O";
        return {
          ...s,
          startingGenderPattern: starting,
          startingSide,
          nextSide: nextSideAfterPoints(pts, startingSide),
          nextGenderPattern: nextGenderPatternAfterPoints(pts, starting),
        } as MatchState;
      },
    },
  ),
);

export function selectLastPointPlayerIds(): string[] {
  return getLastPointPlayerIds(useMatchStore.getState().points);
}
