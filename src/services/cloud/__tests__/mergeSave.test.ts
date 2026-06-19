/**
 * @file mergeSave.test
 * @module services/cloud/__tests__/mergeSave
 *
 * Unit tests for the iCloud save merge logic (mergeSave).
 * Covers monotonic counters, streak resolution, latest-wins, and rev clock.
 */

import { mergeSave } from '../mergeSave';
import type { SaveDocumentV1 } from '../saveDocument';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/**
 * Factory for test save documents with sensible defaults.
 *
 * @param overrides - Partial fields to override defaults.
 */
function makeDoc(overrides: DeepPartial<SaveDocumentV1> = {}): SaveDocumentV1 {
  return {
    schemaVersion: 1,
    rev: overrides.rev ?? 1,
    updatedAt: overrides.updatedAt ?? 1_000,
    progress: {
      catName: 'Miso',
      hasNamedCat: false,
      xp: 0,
      lifetimePointsEarned: 0,
      pointsSpent: 0,
      longestStreak: 0,
      currentStreak: 0,
      lastOpenDate: undefined,
      ...overrides.progress,
    },
    cosmetics: {
      ownedCosmeticIds: [],
      equipped: {},
      ...overrides.cosmetics,
    } as SaveDocumentV1['cosmetics'],
    settings: {
      soundEnabled: true,
      hapticsEnabled: true,
      notificationsEnabled: true,
      ...overrides.settings,
    },
  };
}

describe('mergeSave', () => {
  it('takes the max of monotonic counters and unions owned cosmetics', () => {
    const local = makeDoc({
      progress: { xp: 160, lifetimePointsEarned: 150, longestStreak: 5 },
      cosmetics: { ownedCosmeticIds: ['free', 'hat-a'] },
    });
    const remote = makeDoc({
      progress: { xp: 100, lifetimePointsEarned: 120, longestStreak: 8 },
      cosmetics: { ownedCosmeticIds: ['free', 'hat-b'] },
    });

    const merged = mergeSave(local, remote);

    expect(merged.progress.xp).toBe(160);
    expect(merged.progress.lifetimePointsEarned).toBe(150);
    expect(merged.progress.longestStreak).toBe(8);
    expect(merged.cosmetics.ownedCosmeticIds.sort()).toEqual(['free', 'hat-a', 'hat-b']);
  });

  it('keeps both earnings and a purchase when one device earns and the other buys', () => {
    // Both start at earned=100, spent=0. A pets (+50 earned). B buys a 50 item.
    const local = makeDoc({
      progress: { lifetimePointsEarned: 150, pointsSpent: 0 },
      cosmetics: { ownedCosmeticIds: ['free'] },
    });
    const remote = makeDoc({
      progress: { lifetimePointsEarned: 100, pointsSpent: 50 },
      cosmetics: { ownedCosmeticIds: ['free', 'collar-x'] },
    });

    const merged = mergeSave(local, remote);
    const balance = merged.progress.lifetimePointsEarned - merged.progress.pointsSpent;

    expect(merged.progress.lifetimePointsEarned).toBe(150);
    expect(merged.progress.pointsSpent).toBe(50);
    expect(balance).toBe(100); // started 100, +50 earned, -50 spent
    expect(merged.cosmetics.ownedCosmeticIds).toContain('collar-x');
  });

  it('never lets the derived balance go negative', () => {
    const local = makeDoc({ progress: { lifetimePointsEarned: 90, pointsSpent: 90 } });
    const remote = makeDoc({ progress: { lifetimePointsEarned: 150, pointsSpent: 0 } });

    const merged = mergeSave(local, remote);

    expect(merged.progress.lifetimePointsEarned).toBeGreaterThanOrEqual(merged.progress.pointsSpent);
  });

  it('resolves the streak by the more recent open date', () => {
    const local = makeDoc({ progress: { currentStreak: 3, lastOpenDate: '2026-06-18', longestStreak: 3 } });
    const remote = makeDoc({ progress: { currentStreak: 9, lastOpenDate: '2026-06-10', longestStreak: 9 } });

    const merged = mergeSave(local, remote);

    expect(merged.progress.currentStreak).toBe(3); // local has the newer date
    expect(merged.progress.lastOpenDate).toBe('2026-06-18');
    expect(merged.progress.longestStreak).toBe(9); // longest is always max
  });

  it('uses max currentStreak when open dates tie', () => {
    const local = makeDoc({ progress: { currentStreak: 2, lastOpenDate: '2026-06-18' } });
    const remote = makeDoc({ progress: { currentStreak: 5, lastOpenDate: '2026-06-18' } });

    const merged = mergeSave(local, remote);

    expect(merged.progress.currentStreak).toBe(5);
  });

  it('lets the higher-rev document win latest-wins fields and latches naming', () => {
    const local = makeDoc({
      rev: 7,
      progress: { catName: 'Whiskers', hasNamedCat: true },
      cosmetics: { ownedCosmeticIds: [], equipped: { hat: 'crown' } },
      settings: { soundEnabled: false, hapticsEnabled: true, notificationsEnabled: true },
    });
    const remote = makeDoc({
      rev: 3,
      progress: { catName: 'Miso', hasNamedCat: false },
      cosmetics: { ownedCosmeticIds: [], equipped: { hat: 'beanie' } },
      settings: { soundEnabled: true, hapticsEnabled: true, notificationsEnabled: false },
    });

    const merged = mergeSave(local, remote);

    expect(merged.progress.catName).toBe('Whiskers');
    expect(merged.progress.hasNamedCat).toBe(true);
    expect(merged.cosmetics.equipped).toEqual({ hat: 'crown' });
    expect(merged.settings.soundEnabled).toBe(false);
  });

  it('breaks rev ties using updatedAt', () => {
    const local = makeDoc({ rev: 4, updatedAt: 5_000, progress: { catName: 'Newer' } });
    const remote = makeDoc({ rev: 4, updatedAt: 1_000, progress: { catName: 'Older' } });

    expect(mergeSave(local, remote).progress.catName).toBe('Newer');
  });

  it('advances the logical clock to max(rev) + 1', () => {
    const merged = mergeSave(makeDoc({ rev: 4 }), makeDoc({ rev: 9 }));

    expect(merged.rev).toBe(10);
  });
});
