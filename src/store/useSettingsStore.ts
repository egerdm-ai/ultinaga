import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamRules } from "@/types/models";
import { DEFAULT_TEAM_RULES } from "@/data/defaultTeamRules";
import { DEFAULT_GAME_CAP } from "@/lib/estimateRemaining";

interface SettingsState {
  teamRules: TeamRules;
  targetCap: number;
  setTeamRules: (rules: TeamRules) => void;
  setTargetCap: (n: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      teamRules: DEFAULT_TEAM_RULES,
      targetCap: DEFAULT_GAME_CAP,
      setTeamRules: (teamRules) => set({ teamRules }),
      setTargetCap: (targetCap) => set({ targetCap }),
    }),
    { name: "ulm-settings" },
  ),
);
