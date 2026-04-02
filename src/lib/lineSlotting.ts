import type { Player } from "@/types/models";
import { rosterById } from "@/lib/playerStats";

export const SLOT_ORDER = [
  "H1",
  "H2",
  "H3",
  "C1",
  "C2",
  "C3",
  "C4",
] as const;

export type SlotId = (typeof SLOT_ORDER)[number];

export function handlerScore(p: Player): number {
  return (
    p.handlerReliability +
    (p.primaryRole === "handler" ? 6 : 0) +
    (p.primaryRole === "hybrid" ? 3 : 0)
  );
}

export function cutterScore(p: Player): number {
  return (
    p.cutterImpact +
    (p.primaryRole === "cutter" ? 6 : 0) +
    (p.primaryRole === "hybrid" ? 3 : 0)
  );
}

/**
 * Deterministic H1–H3 / C1–C4 layout: top 3 by handler score → H slots;
 * remaining 4 by cutter score → C slots.
 */
export function assignPlayersToSlots(
  playerIds: string[],
  roster: Player[],
): Record<SlotId, string> | null {
  if (playerIds.length !== 7) return null;
  const map = rosterById(roster);
  const items: { id: string; p: Player; hs: number; cs: number }[] = [];
  for (const id of playerIds) {
    const p = map.get(id);
    if (!p) return null;
    items.push({ id, p, hs: handlerScore(p), cs: cutterScore(p) });
  }
  const sortedByH = [...items].sort((a, b) => b.hs - a.hs);
  const top3 = sortedByH.slice(0, 3);
  const rest = sortedByH.slice(3);
  const sortedRestByC = [...rest].sort((a, b) => b.cs - a.cs);
  return {
    H1: top3[0]!.id,
    H2: top3[1]!.id,
    H3: top3[2]!.id,
    C1: sortedRestByC[0]!.id,
    C2: sortedRestByC[1]!.id,
    C3: sortedRestByC[2]!.id,
    C4: sortedRestByC[3]!.id,
  };
}

export function emptySlots(): Record<SlotId, string | null> {
  return {
    H1: null,
    H2: null,
    H3: null,
    C1: null,
    C2: null,
    C3: null,
    C4: null,
  };
}

export function slotsToIds(
  slots: Record<SlotId, string | null>,
): string[] {
  return SLOT_ORDER.map((s) => slots[s]).filter(Boolean) as string[];
}

export function idsToSlots(
  playerIds: string[],
  roster: Player[],
): Record<SlotId, string | null> {
  const a = assignPlayersToSlots(playerIds, roster);
  if (!a) return emptySlots();
  return { ...a };
}

export function isHandlerSlot(slot: SlotId): boolean {
  return slot.startsWith("H");
}

/** Sort candidate ids for a slot: H slots prefer handler-leaning, C slots cutter-leaning. */
export function sortCandidatesForSlot(
  ids: string[],
  roster: Player[],
  slot: SlotId,
): string[] {
  const map = rosterById(roster);
  const score = (id: string) => {
    const p = map.get(id);
    if (!p) return 0;
    if (isHandlerSlot(slot)) return handlerScore(p);
    return cutterScore(p);
  };
  return [...ids].sort((a, b) => score(b) - score(a));
}

export function placePlayerInSlot(
  slots: Record<SlotId, string | null>,
  slot: SlotId,
  playerId: string,
): Record<SlotId, string | null> {
  const next: Record<SlotId, string | null> = { ...slots };
  for (const s of SLOT_ORDER) {
    if (next[s] === playerId) next[s] = null;
  }
  next[slot] = playerId;
  return next;
}

export function firstEmptySlot(
  slots: Record<SlotId, string | null>,
): SlotId | null {
  for (const s of SLOT_ORDER) {
    if (slots[s] === null) return s;
  }
  return null;
}

/** If a slot is active, use it; otherwise fill first empty H→C slot. */
export function addPlayerToSlots(
  slots: Record<SlotId, string | null>,
  playerId: string,
  activeSlot: SlotId | null,
): Record<SlotId, string | null> {
  if (activeSlot) return placePlayerInSlot(slots, activeSlot, playerId);
  const empty = firstEmptySlot(slots);
  if (!empty) return slots;
  return placePlayerInSlot(slots, empty, playerId);
}

export function slotRoleMismatch(
  slot: SlotId,
  playerId: string,
  roster: Player[],
): string | null {
  const map = rosterById(roster);
  const p = map.get(playerId);
  if (!p) return null;
  const h = handlerScore(p);
  const c = cutterScore(p);
  if (isHandlerSlot(slot)) {
    if (p.primaryRole === "cutter" && h < c - 2) {
      return "Cutter-leaning in handler slot";
    }
  } else if (p.primaryRole === "handler" && c < h - 2) {
    return "Handler-leaning in cutter slot";
  }
  return null;
}
