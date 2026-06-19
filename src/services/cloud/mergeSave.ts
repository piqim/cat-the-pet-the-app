import type { SaveDocumentV1 } from './saveDocument';

/**
 * Non-destructive, deterministic merge of two save documents.
 *
 * Rules (see plan):
 * - Monotonic numeric fields take max() so neither earnings nor purchases are
 *   ever lost when two devices diverge offline.
 * - Owned cosmetics are unioned.
 * - "Latest-wins" fields (cat name, equipped, settings) follow the document
 *   with the higher logical `rev` (tiebroken by `updatedAt`).
 * - The streak pair follows whichever document has the more recent open date.
 */
export function mergeSave(local: SaveDocumentV1, remote: SaveDocumentV1): SaveDocumentV1 {
  const latest = isLeftNewer(local, remote) ? local : remote;
  const streak = mergeStreak(local, remote);

  const lifetimePointsEarned = Math.max(
    local.progress.lifetimePointsEarned,
    remote.progress.lifetimePointsEarned,
  );
  const pointsSpent = Math.max(local.progress.pointsSpent, remote.progress.pointsSpent);

  return {
    schemaVersion: 1,
    rev: Math.max(local.rev, remote.rev) + 1,
    updatedAt: Date.now(),
    progress: {
      catName: latest.progress.catName,
      // Naming is a one-way latch: once named on any device, stay named.
      hasNamedCat: local.progress.hasNamedCat || remote.progress.hasNamedCat,
      xp: Math.max(local.progress.xp, remote.progress.xp),
      lifetimePointsEarned,
      pointsSpent,
      longestStreak: Math.max(local.progress.longestStreak, remote.progress.longestStreak),
      currentStreak: streak.currentStreak,
      lastOpenDate: streak.lastOpenDate,
    },
    cosmetics: {
      ownedCosmeticIds: unionIds(
        local.cosmetics.ownedCosmeticIds,
        remote.cosmetics.ownedCosmeticIds,
      ),
      equipped: { ...latest.cosmetics.equipped },
    },
    settings: { ...latest.settings },
  };
}

// Higher logical rev wins; ties fall back to the wall-clock timestamp, finally
// to `local` for full determinism.
function isLeftNewer(left: SaveDocumentV1, right: SaveDocumentV1): boolean {
  if (left.rev !== right.rev) {
    return left.rev > right.rev;
  }

  return left.updatedAt >= right.updatedAt;
}

function mergeStreak(
  local: SaveDocumentV1,
  remote: SaveDocumentV1,
): { currentStreak: number; lastOpenDate?: string } {
  const localDate = local.progress.lastOpenDate;
  const remoteDate = remote.progress.lastOpenDate;

  // Date keys are YYYY-MM-DD, so string comparison is chronological.
  if (localDate && remoteDate && localDate !== remoteDate) {
    return localDate > remoteDate
      ? { currentStreak: local.progress.currentStreak, lastOpenDate: localDate }
      : { currentStreak: remote.progress.currentStreak, lastOpenDate: remoteDate };
  }

  return {
    currentStreak: Math.max(local.progress.currentStreak, remote.progress.currentStreak),
    lastOpenDate: localDate ?? remoteDate,
  };
}

function unionIds(left: readonly string[], right: readonly string[]): string[] {
  return Array.from(new Set([...left, ...right]));
}
