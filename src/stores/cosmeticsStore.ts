import { create } from 'zustand';

import { COSMETICS, CosmeticSlot } from '../data/cosmetics';

type EquippedCosmetics = Partial<Record<CosmeticSlot, string>>;

export type CosmeticsState = {
  ownedCosmeticIds: string[];
  equipped: EquippedCosmetics;
  purchase: (cosmeticId: string) => void;
  equip: (slot: CosmeticSlot, cosmeticId: string) => void;
};

export const useCosmeticsStore = create<CosmeticsState>((set) => ({
  ownedCosmeticIds: COSMETICS.filter((item) => item.pricePoints === 0).map((item) => item.id),
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
}));
