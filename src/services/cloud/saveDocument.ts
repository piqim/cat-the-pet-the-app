import { CosmeticSlot } from '../../data/cosmetics';
import { getLevelForXp } from '../../data/levelCurve';
import { useCosmeticsStore } from '../../stores/cosmeticsStore';
import { useProgressStore } from '../../stores/progressStore';
import { useSettingsStore } from '../../stores/settingsStore';

export const SAVE_DOC_KEY = 'save-doc-v1';
export const SAVE_DOC_SCHEMA_VERSION = 1 as const;

export type SaveDocumentV1 = {
  schemaVersion: typeof SAVE_DOC_SCHEMA_VERSION;
  // Logical clock: incremented on every merge/local push. Used as the primary
  // tiebreaker for latest-wins fields, independent of wall-clock skew.
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

/** Snapshot the current store state into a save document. */
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

/** Push a merged save document back into the stores (which persists to MMKV). */
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

export function serializeSaveDocument(doc: SaveDocumentV1): string {
  return JSON.stringify(doc);
}

/** Parse and shallowly validate a stored document; returns null if unusable. */
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

function stripUndefined(equipped: Partial<Record<CosmeticSlot, string>>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [slot, value] of Object.entries(equipped)) {
    if (typeof value === 'string') {
      result[slot] = value;
    }
  }

  return result;
}
