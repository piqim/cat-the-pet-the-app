/**
 * @file progressStore
 * @module stores/progressStore
 *
 * Core player progression: cat name, XP/level, coins, and daily streak.
 * Persisted to MMKV (`progress-v2`) and synced to iCloud via cloudSyncService.
 *
 * Coin model uses monotonic counters (`lifetimePointsEarned`, `pointsSpent`) so
 * two offline devices can merge without losing earnings or purchases. The
 * spendable `points` field is derived: `max(0, earned - spent)`.
 *
 * Edge cases:
 * - `petEnergy` and `lastRewardAt` are session-only (anti-grind); not persisted
 *   or synced — each device/session starts with full energy.
 * - `spendPoints(0)` or negative amounts succeed without mutation (no-op spend).
 * - `spendPoints` returns false when balance is insufficient; Shop must check.
 * - Legacy `progress-v1` saves are migrated once on first v2 hydration.
 * - `registerDailyOpen` is idempotent within the same local calendar day.
 * - `nameCat('')` falls back to `'Miso'`.
 *
 * Usage:
 *   const { points, level } = useProgressStore();
 *   useProgressStore.getState().grantPetReward(1.5);
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getLevelForXp } from '../data/levelCurve';
import { TUNING } from '../data/tuning';
import { computeRewardEnergy } from '../engine/antiGrind';
import { evaluateStreak, getLocalDateKey, StreakResult } from '../services/streakService';
import { zustandMmkvStorage } from './mmkvStorage';

/** Result of {@link ProgressState.registerDailyOpen}, including any milestone bonus. */
export type DailyOpenResult = StreakResult & {
  rewardPoints: number;
};

/**
 * Progress store state and actions.
 *
 * @property points - Derived spendable balance. Do not set directly; updated by
 *   grant/spend/migrate actions.
 * @property lifetimePointsEarned - Monotonic total coins ever earned (sync-safe).
 * @property pointsSpent - Monotonic total coins ever spent (sync-safe).
 * @property petEnergy - Session anti-grind energy in [0, 1]. Not persisted.
 * @property lastRewardAt - Timestamp of last reward grant. Not persisted.
 */
export type ProgressState = {
  catName: string;
  hasNamedCat: boolean;
  points: number;
  lifetimePointsEarned: number;
  pointsSpent: number;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastOpenDate?: string;
  petEnergy: number;
  lastRewardAt: number;
  nameCat: (name: string) => void;
  grantPetReward: (multiplier?: number) => void;
  spendPoints: (amount: number) => boolean;
  registerDailyOpen: () => DailyOpenResult;
};

const STORAGE_KEY = 'progress-v2';
const LEGACY_STORAGE_KEY = 'progress-v1';

/**
 * Computes the spendable coin balance from monotonic counters.
 *
 * @param earned - Lifetime points earned.
 * @param spent - Lifetime points spent.
 * @returns Non-negative balance (`max(0, earned - spent)`).
 */
const deriveBalance = (earned: number, spent: number): number => Math.max(0, earned - spent);

/** Shape of fields written to MMKV by the persist middleware. */
type PersistedProgress = {
  catName: string;
  hasNamedCat: boolean;
  xp: number;
  level: number;
  lifetimePointsEarned: number;
  pointsSpent: number;
  currentStreak: number;
  longestStreak: number;
  lastOpenDate?: string;
};

/**
 * One-time import from the legacy `progress-v1` MMKV key.
 *
 * The v1 schema stored a raw `points` balance. We map that into
 * `lifetimePointsEarned` with `pointsSpent = 0` (no purchase history to recover).
 *
 * @returns Parsed legacy fields, or undefined if no v1 save exists or JSON is corrupt.
 */
function readLegacyProgress(): Partial<PersistedProgress> | undefined {
  const raw = zustandMmkvStorage.getItem(LEGACY_STORAGE_KEY);

  if (!raw) {
    return undefined;
  }

  try {
    const legacy = (JSON.parse(raw as string) as { state?: Record<string, unknown> }).state;

    if (!legacy) {
      return undefined;
    }

    const legacyPoints = typeof legacy.points === 'number' ? legacy.points : 0;

    return {
      catName: typeof legacy.catName === 'string' ? legacy.catName : undefined,
      hasNamedCat: Boolean(legacy.hasNamedCat),
      xp: typeof legacy.xp === 'number' ? legacy.xp : 0,
      lifetimePointsEarned: legacyPoints,
      pointsSpent: 0,
      currentStreak: typeof legacy.currentStreak === 'number' ? legacy.currentStreak : 0,
      longestStreak: typeof legacy.longestStreak === 'number' ? legacy.longestStreak : 0,
      lastOpenDate: typeof legacy.lastOpenDate === 'string' ? legacy.lastOpenDate : undefined,
    };
  } catch {
    return undefined;
  }
}

/** Persisted player progression. MMKV key: `progress-v2`. */
export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      catName: 'Miso',
      hasNamedCat: false,
      points: 0,
      lifetimePointsEarned: 0,
      pointsSpent: 0,
      xp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      petEnergy: 1,
      lastRewardAt: 0,
      nameCat: (name) => set({ catName: name.trim() || 'Miso', hasNamedCat: true }),
      grantPetReward: (multiplier = 1) =>
        set((state) => {
          const now = Date.now();
          const { rewardMultiplier, nextEnergy } = computeRewardEnergy(
            state.petEnergy,
            state.lastRewardAt,
            now,
          );
          const effectiveMultiplier = multiplier * rewardMultiplier;
          const earnedPoints = Math.ceil(TUNING.POINTS_PER_PET * effectiveMultiplier);
          const xp = state.xp + Math.ceil(TUNING.XP_PER_PET * effectiveMultiplier);
          const lifetimePointsEarned = state.lifetimePointsEarned + earnedPoints;

          return {
            lifetimePointsEarned,
            points: deriveBalance(lifetimePointsEarned, state.pointsSpent),
            xp,
            level: getLevelForXp(xp),
            petEnergy: nextEnergy,
            lastRewardAt: now,
          };
        }),
      spendPoints: (amount) => {
        if (amount <= 0) {
          return true;
        }

        const state = get();

        if (state.points < amount) {
          return false;
        }

        const pointsSpent = state.pointsSpent + amount;

        set({
          pointsSpent,
          points: deriveBalance(state.lifetimePointsEarned, pointsSpent),
        });

        return true;
      },
      registerDailyOpen: () => {
        const state = get();
        const result = evaluateStreak(
          {
            currentStreak: state.currentStreak,
            longestStreak: state.longestStreak,
            lastOpenDate: state.lastOpenDate,
          },
          getLocalDateKey(new Date()),
          TUNING.STREAK_MILESTONES,
        );

        const rewardPoints = result.hitMilestone
          ? result.currentStreak * TUNING.STREAK_MILESTONE_BONUS_PER_DAY
          : 0;

        const lifetimePointsEarned = state.lifetimePointsEarned + rewardPoints;

        set({
          currentStreak: result.currentStreak,
          longestStreak: result.longestStreak,
          lastOpenDate: result.lastOpenDate,
          lifetimePointsEarned,
          points: deriveBalance(lifetimePointsEarned, state.pointsSpent),
        });

        return { ...result, rewardPoints };
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => zustandMmkvStorage),
      partialize: (state) => ({
        catName: state.catName,
        hasNamedCat: state.hasNamedCat,
        xp: state.xp,
        level: getLevelForXp(state.xp),
        lifetimePointsEarned: state.lifetimePointsEarned,
        pointsSpent: state.pointsSpent,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastOpenDate: state.lastOpenDate,
      }),
      merge: (persistedState, currentState) => {
        let persisted = persistedState as Partial<PersistedProgress> | undefined;

        if (!persisted || Object.keys(persisted).length === 0) {
          persisted = readLegacyProgress() ?? persisted;
        }

        const xp = persisted?.xp ?? currentState.xp;
        const lifetimePointsEarned =
          persisted?.lifetimePointsEarned ?? currentState.lifetimePointsEarned;
        const pointsSpent = persisted?.pointsSpent ?? currentState.pointsSpent;

        return {
          ...currentState,
          ...persisted,
          xp,
          lifetimePointsEarned,
          pointsSpent,
          points: deriveBalance(lifetimePointsEarned, pointsSpent),
          level: getLevelForXp(xp),
        };
      },
    },
  ),
);
