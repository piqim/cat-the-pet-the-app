/**
 * @file streakService
 * @module services/streakService
 *
 * Daily open-streak evaluation. Called once per app launch from progressStore
 * to track consecutive calendar days the user opens the app.
 *
 * Edge cases:
 * - Uses local device calendar (YYYY-MM-DD keys), not UTC.
 * - Opening twice on the same day is a no-op (`isNewDay: false`).
 * - Missing a day resets streak to 1 (not 0).
 * - `lastOpenDate` undefined on first launch → streak starts at 1.
 * - Milestone bonus fires only on the day the threshold is first reached.
 *
 * Usage:
 *   const result = evaluateStreak(state, getLocalDateKey(new Date()), milestones);
 */

/** Persisted streak fields (subset of progressStore). */
export type StreakState = {
  currentStreak: number;
  longestStreak: number;
  lastOpenDate?: string;
};

/** Result of {@link evaluateStreak}, including flags for UI side-effects. */
export type StreakResult = StreakState & {
  /** True when this call advanced the streak to a new calendar day. */
  isNewDay: boolean;
  /** True when currentStreak matches a milestone threshold today. */
  hitMilestone: boolean;
};

/**
 * Evaluates whether today's open continues, breaks, or starts a streak.
 *
 * @param state - Current streak state from progressStore.
 * @param today - Local date key for today (default: now).
 * @param milestones - Day-count thresholds that trigger bonus rewards.
 * @returns Updated streak state with isNewDay and hitMilestone flags.
 */
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

/**
 * Formats a Date as a local calendar key `YYYY-MM-DD`.
 * Lexically comparable for chronological ordering.
 *
 * @param date - Date to format (uses local timezone).
 * @returns Date key string.
 */
export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Returns a new Date offset by the given number of days.
 *
 * @param date - Starting date.
 * @param days - Days to add (negative to subtract).
 * @returns New Date instance (does not mutate input).
 */
function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);

  return copy;
}
