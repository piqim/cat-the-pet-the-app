import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { COSMETICS, CosmeticSlot } from '../data/cosmetics';
import { zustandMmkvStorage } from './mmkvStorage';

type EquippedCosmetics = Partial<Record<CosmeticSlot, string>>;

const FREE_COSMETIC_IDS = COSMETICS.filter((item) => item.pricePoints === 0).map(
  (item) => item.id,
);

export type CosmeticsState = {
  ownedCosmeticIds: string[];
  equipped: EquippedCosmetics;
  purchase: (cosmeticId: string) => void;
  equip: (slot: CosmeticSlot, cosmeticId: string) => void;
  unequip: (slot: CosmeticSlot) => void;
};

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
          // Guarantee free items always remain owned even across catalog changes.
          ownedCosmeticIds: Array.from(new Set([...FREE_COSMETIC_IDS, ...ownedFromStorage])),
          equipped: persisted.equipped ?? currentState.equipped,
        };
      },
    },
  ),
);
