/**
 * @file cosmetics
 * @module data/cosmetics
 *
 * Cosmetic item catalog: scenes (stage backdrops), hats, and collars.
 * Each entry defines unlock requirements, shop price, and placeholder visuals
 * used until final layer-separated art ships (PRD phase 7).
 *
 * Edge cases:
 * - Items with `pricePoints: 0` are free and auto-owned on first launch
 *   (see cosmeticsStore merge logic).
 * - `assetKey` maps to future sprite layers; placeholder rendering uses
 *   `swatch`, `glyph`, and `backgroundColor` instead.
 * - `COSMETICS_BY_ID` is rebuilt at module load — duplicate IDs would silently
 *   overwrite; keep IDs unique in the array below.
 * - `isStreakReward` is reserved for future streak-exclusive items (unused).
 *
 * Usage:
 *   import { COSMETICS, getCosmeticById } from '../data/cosmetics';
 *   const hat = getCosmeticById('party-hat');
 */

/** Broad grouping used for shop section headers. */
export type CosmeticCategory = 'hat' | 'collar' | 'scene';

/** Render slot on the cat sprite or stage. One equipped item per slot. */
export type CosmeticSlot = 'head' | 'collar' | 'scene';

/**
 * A single purchasable/equippable cosmetic item.
 *
 * @property id - Stable string key used in stores and save documents.
 * @property category - Shop grouping (scene / hat / collar).
 * @property slot - Which equip slot this item occupies.
 * @property displayName - Human-readable name shown in the shop.
 * @property assetKey - Future sprite layer filename (not yet wired to art).
 * @property unlockLevel - Minimum player level before the item appears in shop.
 * @property pricePoints - Coin cost; 0 means free.
 * @property isStreakReward - Reserved: streak-exclusive items (not yet used).
 * @property swatch - Hex color for shop chip and placeholder tint on cat.
 * @property glyph - Optional emoji rendered on the placeholder cat layer.
 * @property backgroundColor - Scene-only: stage backdrop color behind the cat.
 */
export type Cosmetic = {
  id: string;
  category: CosmeticCategory;
  slot: CosmeticSlot;
  displayName: string;
  assetKey: string;
  unlockLevel: number;
  pricePoints: number;
  isStreakReward?: boolean;
  swatch: string;
  glyph?: string;
  backgroundColor?: string;
};

/**
 * Full cosmetic catalog, ordered by category blocks (scenes → hats → collars).
 * Shop iterates this array filtered by `unlockLevel` and ownership.
 */
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

/**
 * O(1) lookup map built from {@link COSMETICS}. Keys are cosmetic `id` strings.
 */
export const COSMETICS_BY_ID: Record<string, Cosmetic> = Object.fromEntries(
  COSMETICS.map((item) => [item.id, item]),
);

/**
 * Resolves a cosmetic by its stable ID.
 *
 * @param id - Cosmetic ID string, or undefined when no item is equipped.
 * @returns The matching {@link Cosmetic}, or undefined if `id` is falsy or unknown.
 *
 * @example
 * getCosmeticById('party-hat')  // → Cosmetic
 * getCosmeticById(undefined)    // → undefined
 * getCosmeticById('missing')    // → undefined
 */
export function getCosmeticById(id: string | undefined): Cosmetic | undefined {
  return id ? COSMETICS_BY_ID[id] : undefined;
}

/** Display order for shop category sections. */
export const COSMETIC_CATEGORY_ORDER: CosmeticCategory[] = ['scene', 'hat', 'collar'];

/** Human-readable labels for each {@link CosmeticCategory}. */
export const COSMETIC_CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  scene: 'Scenes',
  hat: 'Hats',
  collar: 'Collars',
};
