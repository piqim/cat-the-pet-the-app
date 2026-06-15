export type StreakState = {
  currentStreak: number;
  longestStreak: number;
  lastOpenDate?: string;
};

export type StreakResult = StreakState & {
  isNewDay: boolean;
  hitMilestone: boolean;
};

export function evaluateStreak(
  state: StreakState,
  today = getLocalDateKey(new Date()),
  milestones: readonly number[] = [],
): StreakResult {
  if (state.lastOpenDate === today) {
    return {
      ...state,
      isNewDay: false,
      hitMilestone: false,
    };
  }

  const yesterday = getLocalDateKey(addDays(new Date(), -1));
  const currentStreak = state.lastOpenDate === yesterday ? state.currentStreak + 1 : 1;

  return {
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    lastOpenDate: today,
    isNewDay: true,
    hitMilestone: milestones.includes(currentStreak),
  };
}

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);

  return copy;
}
