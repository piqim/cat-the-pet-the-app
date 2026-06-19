/**
 * @file cosmeticsStore
 * @module stores/cosmeticsStore
 *
 * Tracks owned and equipped cosmetic items (scenes, hats, collars). Purchases
 * are recorded here; spending coins is handled by progressStore.spendPoints
 * in the Shop component before calling purchase().
 *
 * Edge cases:
 * - Free items (`pricePoints: 0`) are always re-injected on merge so catalog
 *   additions stay owned even for existing saves.
 * - `equip` does not validate ownership — Shop guards that before calling.
 * - Owned IDs are unioned (not replaced) during iCloud merge.
 * - Only one item per slot can be equipped at a time.
 *
 * Usage:
 *   const owned = useCosmeticsStore(s => s.ownedCosmeticIds);
 *   useCosmeticsStore.getState().equip('head', 'party-hat');
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { COSMETICS, CosmeticSlot } from '../data/cosmetics';
import { zustandMmkvStorage } from './mmkvStorage';

/** Map of equip slot → cosmetic ID. Absent keys mean nothing equipped in that slot. */
type EquippedCosmetics = Partial<Record<CosmeticSlot, string>>;

/** IDs of all free cosmetics, computed once from the catalog at module load. */
const FREE_COSMETIC_IDS = COSMETICS.filter((item) => item.pricePoints === 0).map(
  (item) => item.id,
);

/**
 * Cosmetics store state and actions.
 *
 * @property ownedCosmeticIds - Cosmetic IDs the player has purchased or received free.
 * @property equipped - Currently worn items keyed by slot.
 */
export type CosmeticsState = {
  ownedCosmeticIds: string[];
  equipped: EquippedCosmetics;
  /** Adds a cosmetic to owned list (idempotent — no-op if already owned). */
  purchase: (cosmeticId: string) => void;
  /** Equips a cosmetic in the given slot, replacing any previous item there. */
  equip: (slot: CosmeticSlot, cosmeticId: string) => void;
  /** Removes the equipped item from a slot without un-owning it. */
  unequip: (slot: CosmeticSlot) => void;
};

/** Persisted cosmetics state. MMKV key: `cosmetics-v1`. */
export const useCosmeticsStore = create<CosmeticsState>()(
  persist(
    (set) => ({
      ownedCosmeticIds: FREE_COSMETIC_IDS,
      equipped: {
        scene: 'cozy-cushion',
      },
      purchase: (cosmeticId) =>
        set((state) => ({
          ownedCosmeticIds: state.ownedCosmeticIds.includes(cosmeticId)
            ? state.ownedCosmeticIds
            : [...state.ownedCosmeticIds, cosmeticId],
        })),
      equip: (slot, cosmeticId) =>
        set((state) => ({
          equipped: {
            ...state.equipped,
            [slot]: cosmeticId,
          },
        })),
      unequip: (slot) =>
        set((state) => {
          const next = { ...state.equipped };
          delete next[slot];

          return { equipped: next };
        }),
    }),
    {
      name: 'cosmetics-v1',
      storage: createJSONStorage(() => zustandMmkvStorage),
      partialize: (state) => ({
        ownedCosmeticIds: state.ownedCosmeticIds,
        equipped: state.equipped,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<CosmeticsState>;
        const ownedFromStorage = persisted.ownedCosmeticIds ?? [];

        return {
          ...currentState,
          ...persisted,
          ownedCosmeticIds: Array.from(new Set([...FREE_COSMETIC_IDS, ...ownedFromStorage])),
          equipped: persisted.equipped ?? currentState.equipped,
        };
      },
    },
  ),
);
