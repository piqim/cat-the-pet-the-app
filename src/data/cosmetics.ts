export type CosmeticCategory = 'hat' | 'collar' | 'scene';
export type CosmeticSlot = 'head' | 'collar' | 'scene';

export type Cosmetic = {
  id: string;
  category: CosmeticCategory;
  slot: CosmeticSlot;
  displayName: string;
  assetKey: string;
  unlockLevel: number;
  pricePoints: number;
  isStreakReward?: boolean;
};

export const COSMETICS: Cosmetic[] = [
  {
    id: 'cozy-cushion',
    category: 'scene',
    slot: 'scene',
    displayName: 'Cozy Cushion',
    assetKey: 'scene_cozy_cushion',
    unlockLevel: 1,
    pricePoints: 0,
  },
];
