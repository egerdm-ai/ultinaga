import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Player } from "@/types/models";
import { SEED_PLAYERS } from "@/data/seedPlayers";

interface RosterState {
  players: Player[];
  setPlayers: (players: Player[]) => void;
  upsertPlayer: (player: Player) => void;
  removePlayer: (id: string) => void;
  resetToSeed: () => void;
}

export const useRosterStore = create<RosterState>()(
  persist(
    (set) => ({
      players: SEED_PLAYERS,
      setPlayers: (players) => set({ players }),
      upsertPlayer: (player) =>
        set((s) => ({
          players: [
            ...s.players.filter((p) => p.id !== player.id),
            player,
          ].sort((a, b) => a.name.localeCompare(b.name)),
        })),
      removePlayer: (id) =>
        set((s) => ({ players: s.players.filter((p) => p.id !== id) })),
      resetToSeed: () => set({ players: SEED_PLAYERS }),
    }),
    { name: "ulm-roster" },
  ),
);
