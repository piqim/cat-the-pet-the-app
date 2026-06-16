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
  points: number;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastOpenDate?: string;
  // Transient anti-grind energy (session-only, not persisted).
  petEnergy: number;
  lastRewardAt: number;
  nameCat: (name: string) => void;
  grantPetReward: (multiplier?: number) => void;
  spendPoints: (amount: number) => boolean;
  registerDailyOpen: () => DailyOpenResult;
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      catName: 'Miso',
      hasNamedCat: false,
      points: 0,
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
          const points = state.points + Math.ceil(TUNING.POINTS_PER_PET * effectiveMultiplier);
          const xp = state.xp + Math.ceil(TUNING.XP_PER_PET * effectiveMultiplier);

          return {
            points,
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

        const { points } = get();

        if (points < amount) {
          return false;
        }

        set({ points: points - amount });

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

        set({
          currentStreak: result.currentStreak,
          longestStreak: result.longestStreak,
          lastOpenDate: result.lastOpenDate,
          points: state.points + rewardPoints,
        });

        return { ...result, rewardPoints };
      },
    }),
    {
      name: 'progress-v1',
      storage: createJSONStorage(() => zustandMmkvStorage),
      partialize: (state) => ({
        catName: state.catName,
        hasNamedCat: state.hasNamedCat,
        points: state.points,
        xp: state.xp,
        level: getLevelForXp(state.xp),
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastOpenDate: state.lastOpenDate,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ProgressState>;

        return {
          ...currentState,
          ...persisted,
          level: getLevelForXp(persisted.xp ?? currentState.xp),
        };
      },
    },
  ),
);
