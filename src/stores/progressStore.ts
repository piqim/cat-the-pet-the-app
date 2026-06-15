import { create } from 'zustand';

import { getLevelForXp } from '../data/levelCurve';
import { TUNING } from '../data/tuning';

export type ProgressState = {
  catName: string;
  points: number;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastOpenDate?: string;
  nameCat: (name: string) => void;
  grantPetReward: (multiplier?: number) => void;
  setStreak: (currentStreak: number, lastOpenDate: string) => void;
};

export const useProgressStore = create<ProgressState>((set) => ({
  catName: 'Miso',
  points: 0,
  xp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  nameCat: (name) => set({ catName: name.trim() || 'Miso' }),
  grantPetReward: (multiplier = 1) =>
    set((state) => {
      const points = state.points + Math.ceil(TUNING.POINTS_PER_PET * multiplier);
      const xp = state.xp + Math.ceil(TUNING.XP_PER_PET * multiplier);

      return {
        points,
        xp,
        level: getLevelForXp(xp),
      };
    }),
  setStreak: (currentStreak, lastOpenDate) =>
    set((state) => ({
      currentStreak,
      longestStreak: Math.max(state.longestStreak, currentStreak),
      lastOpenDate,
    })),
}));
