import { useMemo } from "react";
import { recommendNextLine } from "@/lib/recommendationEngine";
import { useMatchStore } from "@/store/useMatchStore";
import { useRosterStore } from "@/store/useRosterStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getLastPointPlayerIds } from "@/lib/playerStats";

export function useRecommendation(lockedPlayerIds?: string[]) {
  const points = useMatchStore((s) => s.points);
  const scoreUs = useMatchStore((s) => s.scoreUs);
  const scoreThem = useMatchStore((s) => s.scoreThem);
  const mode = useMatchStore((s) => s.mode);
  const nextSide = useMatchStore((s) => s.nextSide);
  const nextGenderPattern = useMatchStore((s) => s.nextGenderPattern);
  const savedLines = useMatchStore((s) => s.savedLines);
  const players = useRosterStore((s) => s.players);
  const teamRules = useSettingsStore((s) => s.teamRules);

  return useMemo(
    () =>
      recommendNextLine(
        players,
        points,
        {
          side: nextSide,
          genderPattern: nextGenderPattern,
          mode,
        },
        teamRules,
        {
          scoreUs,
          scoreThem,
          lastPointPlayerIds: getLastPointPlayerIds(points),
          lockedPlayerIds,
          savedLines,
        },
      ),
    [
      players,
      points,
      mode,
      nextSide,
      nextGenderPattern,
      teamRules,
      scoreUs,
      scoreThem,
      savedLines,
      lockedPlayerIds,
    ],
  );
}
