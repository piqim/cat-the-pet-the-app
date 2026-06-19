/**
 * @file saveDocument
 * @module services/cloud/saveDocument
 *
 * Versioned save document that mirrors all three Zustand stores into a single
 * JSON blob for iCloud KVS. One key (`save-doc-v1`), well within KVS limits.
 *
 * Edge cases:
 * - parseSaveDocument returns null on corrupt/missing/wrong-schema data.
 * - applySaveDocument overwrites all three stores synchronously (triggers MMKV persist).
 * - Derived `points` balance is recomputed on apply (never stored in the document).
 * - stripUndefined removes empty equip slots before serialization.
 *
 * Usage:
 *   const doc = composeSaveDocument(rev);
 *   iCloudKvs.setItem(SAVE_DOC_KEY, serializeSaveDocument(doc));
 */

import { CosmeticSlot } from '../../data/cosmetics';
import { getLevelForXp } from '../../data/levelCurve';
import { useCosmeticsStore } from '../../stores/cosmeticsStore';
import { useProgressStore } from '../../stores/progressStore';
import { useSettingsStore } from '../../stores/settingsStore';

/** iCloud KVS key for the serialized save document. */
export const SAVE_DOC_KEY = 'save-doc-v1';

/** Current schema version; bump when the document shape changes. */
export const SAVE_DOC_SCHEMA_VERSION = 1 as const;

/**
 * Complete save snapshot synced across devices.
 *
 * @property rev - Logical clock for latest-wins conflict resolution.
 * @property updatedAt - Wall-clock tiebreaker (ms since epoch).
 */
export type SaveDocumentV1 = {
  schemaVersion: typeof SAVE_DOC_SCHEMA_VERSION;
  rev: number;
  updatedAt: number;
  progress: {
    catName: string;
    hasNamedCat: boolean;
    xp: number;
    lifetimePointsEarned: number;
    pointsSpent: number;
    longestStreak: number;
    currentStreak: number;
    lastOpenDate?: string;
  };
  cosmetics: {
    ownedCosmeticIds: string[];
    equipped: Record<string, string>;
  };
  settings: {
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    notificationsEnabled: boolean;
  };
};

/**
 * Snapshots current Zustand store state into a save document.
 *
 * @param rev - Logical revision to stamp on the document.
 * @param updatedAt - Wall-clock timestamp (default: now).
 * @returns Composed SaveDocumentV1.
 */
export function composeSaveDocument(rev: number, updatedAt: number = Date.now()): SaveDocumentV1 {
  const progress = useProgressStore.getState();
  const cosmetics = useCosmeticsStore.getState();
  const settings = useSettingsStore.getState();

  return {
    schemaVersion: SAVE_DOC_SCHEMA_VERSION,
    rev,
    updatedAt,
    progress: {
      catName: progress.catName,
      hasNamedCat: progress.hasNamedCat,
      xp: progress.xp,
      lifetimePointsEarned: progress.lifetimePointsEarned,
      pointsSpent: progress.pointsSpent,
      longestStreak: progress.longestStreak,
      currentStreak: progress.currentStreak,
      lastOpenDate: progress.lastOpenDate,
    },
    cosmetics: {
      ownedCosmeticIds: [...cosmetics.ownedCosmeticIds],
      equipped: stripUndefined(cosmetics.equipped),
    },
    settings: {
      soundEnabled: settings.soundEnabled,
      hapticsEnabled: settings.hapticsEnabled,
      notificationsEnabled: settings.notificationsEnabled,
    },
  };
}

/**
 * Writes a merged save document into all three stores (and MMKV via persist).
 *
 * @param doc - Merged or remote save document to apply.
 */
export function applySaveDocument(doc: SaveDocumentV1): void {
  const balance = Math.max(0, doc.progress.lifetimePointsEarned - doc.progress.pointsSpent);

  useProgressStore.setState({
    catName: doc.progress.catName,
    hasNamedCat: doc.progress.hasNamedCat,
    xp: doc.progress.xp,
    level: getLevelForXp(doc.progress.xp),
    lifetimePointsEarned: doc.progress.lifetimePointsEarned,
    pointsSpent: doc.progress.pointsSpent,
    points: balance,
    longestStreak: doc.progress.longestStreak,
    currentStreak: doc.progress.currentStreak,
    lastOpenDate: doc.progress.lastOpenDate,
  });

  useCosmeticsStore.setState({
    ownedCosmeticIds: [...doc.cosmetics.ownedCosmeticIds],
    equipped: doc.cosmetics.equipped as Partial<Record<CosmeticSlot, string>>,
  });

  useSettingsStore.setState({
    soundEnabled: doc.settings.soundEnabled,
    hapticsEnabled: doc.settings.hapticsEnabled,
    notificationsEnabled: doc.settings.notificationsEnabled,
  });
}

/**
 * Serializes a save document to a JSON string for KVS storage.
 *
 * @param doc - Document to serialize.
 * @returns JSON string.
 */
export function serializeSaveDocument(doc: SaveDocumentV1): string {
  return JSON.stringify(doc);
}

/**
 * Parses and validates a stored save document.
 *
 * @param raw - JSON string from KVS, or null if missing.
 * @returns Parsed document, or null if corrupt or wrong schema version.
 */
export function parseSaveDocument(raw: string | null): SaveDocumentV1 | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SaveDocumentV1>;

    if (
      !parsed ||
      parsed.schemaVersion !== SAVE_DOC_SCHEMA_VERSION ||
      typeof parsed.rev !== 'number' ||
      !parsed.progress ||
      !parsed.cosmetics ||
      !parsed.settings
    ) {
      return null;
    }

    return parsed as SaveDocumentV1;
  } catch {
    return null;
  }
}

/**
 * Removes undefined equip slots so JSON serialization is clean.
 *
 * @param equipped - Partial equip map from cosmeticsStore.
 * @returns Record with only string values.
 */
function stripUndefined(equipped: Partial<Record<CosmeticSlot, string>>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [slot, value] of Object.entries(equipped)) {
    if (typeof value === 'string') {
      result[slot] = value;
    }
  }

  return result;
}
