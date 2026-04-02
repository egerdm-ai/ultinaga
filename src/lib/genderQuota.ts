import type { GenderPattern, Player } from "@/types/models";
import { rosterById } from "@/lib/playerStats";
import {
  firstEmptySlot,
  placePlayerInSlot,
  type SlotId,
  slotsToIds,
} from "@/lib/lineSlotting";

/** 4M3F → en fazla 4 MMP + 3 FMP; 4F3M → 3 MMP + 4 FMP */
export function maxGenderForPattern(
  pattern: GenderPattern,
): { maxM: number; maxF: number } {
  return pattern === "4M3F" ? { maxM: 4, maxF: 3 } : { maxM: 3, maxF: 4 };
}

export function countGenderInLine(
  ids: string[],
  roster: Player[],
): { m: number; f: number } {
  const map = rosterById(roster);
  let m = 0;
  let f = 0;
  for (const id of ids) {
    const p = map.get(id);
    if (!p) continue;
    if (p.gender === "MMP") m++;
    else f++;
  }
  return { m, f };
}

/**
 * Bu oyuncu `targetSlot`a konduğunda M/F üst sınırını aşmıyor mu?
 * (Önce oyuncuyu tüm slotlardan silip sonra hedefe koyar — taşıma ile uyumlu.)
 */
export function canPlacePlayerInLine(
  slots: Record<SlotId, string | null>,
  playerId: string,
  targetSlot: SlotId,
  roster: Player[],
  genderPattern: GenderPattern,
): boolean {
  const map = rosterById(roster);
  const p = map.get(playerId);
  if (!p) return false;
  const next = placePlayerInSlot(slots, targetSlot, playerId);
  const ids = slotsToIds(next);
  const { maxM, maxF } = maxGenderForPattern(genderPattern);
  const { m, f } = countGenderInLine(ids, roster);
  return m <= maxM && f <= maxF;
}

/**
 * Aktif slot veya ilk boş slota yerleştirme kotayı aşar mı?
 */
export function canAddPlayerToLine(
  slots: Record<SlotId, string | null>,
  playerId: string,
  activeSlot: SlotId | null,
  roster: Player[],
  genderPattern: GenderPattern,
): boolean {
  const target = activeSlot ?? firstEmptySlot(slots);
  if (!target) return false;
  return canPlacePlayerInLine(slots, playerId, target, roster, genderPattern);
}
