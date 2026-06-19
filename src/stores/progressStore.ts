import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getLevelForXp } from '../data/levelCurve';
import { TUNING } from '../data/tuning';
import { computeRewardEnergy } from '../engine/antiGrind';
import { evaluateStreak, getLocalDateKey, StreakResult } from '../services/streakService';
import { zustandMmkvStorage } from './mmkvStorage';

export type DailyOpenResult = StreakResult & {
  rewardPoints: number;
};

export type ProgressState = {
  catName: string;
  hasNamedCat: boolean;
  // Derived spendable balance (lifetimePointsEarned - pointsSpent), kept in
  // state so the UI can read it directly. Never mutate it on its own.
  points: number;
  // Monotonic counters: these only ever increase, which lets two diverged
  // devices reconcile via max() without losing earnings or purchases.
  lifetimePointsEarned: number;
  pointsSpent: number;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastOpenDate?: string;
  // Transient anti-grind energy (session-only, not persisted, not synced).
  petEnergy: number;
  lastRewardAt: number;
  nameCat: (name: string) => void;
  grantPetReward: (multiplier?: number) => void;
  spendPoints: (amount: number) => boolean;
  registerDailyOpen: () => DailyOpenResult;
};

const STORAGE_KEY = 'progress-v2';
const LEGACY_STORAGE_KEY = 'progress-v1';

const deriveBalance = (earned: number, spent: number): number => Math.max(0, earned - spent);

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

// One-time migration from the v1 schema, which stored a raw spendable `points`
// balance instead of the earned/spent counters. Reads the legacy MMKV key
// directly because zustand's `migrate` only sees state stored under the new key.
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

        // No v2 data yet: attempt to import an existing v1 save once.
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
