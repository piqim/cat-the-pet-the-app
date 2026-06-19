/**
 * @file mergeSave
 * @module services/cloud/mergeSave
 *
 * Pure, deterministic merge of two iCloud save documents. Used when two
 * devices diverge offline so neither earnings nor purchases are lost.
 *
 * Merge rules:
 * - Monotonic numerics → max(): xp, lifetimePointsEarned, pointsSpent, longestStreak.
 * - Sets → union: ownedCosmeticIds.
 * - Latest-wins (by rev, tiebreak updatedAt): catName, equipped, settings.
 * - Streak → document with the more recent lastOpenDate.
 * - hasNamedCat → OR latch (once named on any device, stays named).
 * - rev → max(local, remote) + 1 on every merge.
 *
 * Edge cases:
 * - Dual offline spend: pointsSpent uses max (under-counts) but owned union
 *   grants both items — minor windfall, acceptable for cozy single-player.
 * - Wall-clock skew only affects latest-wins fields, never monotonic ones.
 * - Automated tests: __tests__/mergeSave.test.ts.
 *
 * Usage:
 *   const merged = mergeSave(localDoc, remoteDoc);
 */

import type { SaveDocumentV1 } from './saveDocument';

/**
 * Merges local and remote save documents without data loss.
 *
 * @param local - This device's composed document.
 * @param remote - Document pulled from iCloud KVS.
 * @returns Merged document with bumped rev and updatedAt.
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

/**
 * Determines which document wins latest-wins fields.
 * Higher rev wins; ties break on updatedAt (local wins final tie).
 *
 * @param left - Local document.
 * @param right - Remote document.
 * @returns True if left should win latest-wins fields.
 */
function isLeftNewer(left: SaveDocumentV1, right: SaveDocumentV1): boolean {
  if (left.rev !== right.rev) {
    return left.rev > right.rev;
  }

  return left.updatedAt >= right.updatedAt;
}

/**
 * Picks the streak pair from whichever document opened most recently.
 *
 * @param local - Local document.
 * @param remote - Remote document.
 * @returns currentStreak and lastOpenDate for the merged result.
 */
function mergeStreak(
  local: SaveDocumentV1,
  remote: SaveDocumentV1,
): { currentStreak: number; lastOpenDate?: string } {
  const localDate = local.progress.lastOpenDate;
  const remoteDate = remote.progress.lastOpenDate;

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

/**
 * Unions two string arrays, deduplicating by Set.
 *
 * @param left - First ID list.
 * @param right - Second ID list.
 * @returns Deduplicated union.
 */
function unionIds(left: readonly string[], right: readonly string[]): string[] {
  return Array.from(new Set([...left, ...right]));
}
