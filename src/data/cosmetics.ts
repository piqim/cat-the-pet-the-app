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
  // Placeholder visuals used until final layer-separated art ships (PRD phase 7).
  // `swatch` drives the shop chip + on-cat placeholder tint; `glyph` is an optional
  // on-cat marker; scenes use `backgroundColor` for the stage backdrop.
  swatch: string;
  glyph?: string;
  backgroundColor?: string;
};

export const COSMETICS: Cosmetic[] = [
  // Scenes (stage backdrop) ---------------------------------------------------
  {
    id: 'cozy-cushion',
    category: 'scene',
    slot: 'scene',
    displayName: 'Cozy Cushion',
    assetKey: 'scene_cozy_cushion',
    unlockLevel: 1,
    pricePoints: 0,
    swatch: '#fff2df',
    backgroundColor: '#fff2df',
  },
  {
    id: 'rainy-windowsill',
    category: 'scene',
    slot: 'scene',
    displayName: 'Rainy Windowsill',
    assetKey: 'scene_rainy_windowsill',
    unlockLevel: 3,
    pricePoints: 120,
    swatch: '#cdd9e6',
    backgroundColor: '#dbe6f0',
  },
  {
    id: 'cardboard-box',
    category: 'scene',
    slot: 'scene',
    displayName: 'Cardboard Box',
    assetKey: 'scene_cardboard_box',
    unlockLevel: 5,
    pricePoints: 220,
    swatch: '#d8b88a',
    backgroundColor: '#ecd9bb',
  },
  {
    id: 'night-blanket',
    category: 'scene',
    slot: 'scene',
    displayName: 'Night Blanket',
    assetKey: 'scene_night_blanket',
    unlockLevel: 8,
    pricePoints: 360,
    swatch: '#352f4d',
    backgroundColor: '#2c2740',
  },

  // Hats (head slot) ----------------------------------------------------------
  {
    id: 'party-hat',
    category: 'hat',
    slot: 'head',
    displayName: 'Party Hat',
    assetKey: 'hat_party',
    unlockLevel: 2,
    pricePoints: 80,
    swatch: '#f28db2',
    glyph: '\u{1F389}',
  },
  {
    id: 'cozy-beanie',
    category: 'hat',
    slot: 'head',
    displayName: 'Cozy Beanie',
    assetKey: 'hat_beanie',
    unlockLevel: 4,
    pricePoints: 160,
    swatch: '#7fae8b',
    glyph: '\u{1F9E2}',
  },
  {
    id: 'tiny-crown',
    category: 'hat',
    slot: 'head',
    displayName: 'Tiny Crown',
    assetKey: 'hat_crown',
    unlockLevel: 10,
    pricePoints: 500,
    swatch: '#f2c94c',
    glyph: '\u{1F451}',
  },

  // Collars (collar slot) -----------------------------------------------------
  {
    id: 'red-bow',
    category: 'collar',
    slot: 'collar',
    displayName: 'Red Bow',
    assetKey: 'collar_red_bow',
    unlockLevel: 1,
    pricePoints: 60,
    swatch: '#d65a5a',
    glyph: '\u{1F380}',
  },
  {
    id: 'bell-collar',
    category: 'collar',
    slot: 'collar',
    displayName: 'Bell Collar',
    assetKey: 'collar_bell',
    unlockLevel: 3,
    pricePoints: 140,
    swatch: '#e8b94b',
    glyph: '\u{1F514}',
  },
  {
    id: 'blue-bandana',
    category: 'collar',
    slot: 'collar',
    displayName: 'Blue Bandana',
    assetKey: 'collar_bandana',
    unlockLevel: 6,
    pricePoints: 240,
    swatch: '#5a86d6',
    glyph: '\u{1F3F5}',
  },
];

export const COSMETICS_BY_ID: Record<string, Cosmetic> = Object.fromEntries(
  COSMETICS.map((item) => [item.id, item]),
);

export function getCosmeticById(id: string | undefined): Cosmetic | undefined {
  return id ? COSMETICS_BY_ID[id] : undefined;
}

export const COSMETIC_CATEGORY_ORDER: CosmeticCategory[] = ['scene', 'hat', 'collar'];

export const COSMETIC_CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  scene: 'Scenes',
  hat: 'Hats',
  collar: 'Collars',
};
