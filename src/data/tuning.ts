export const TUNING = {
  POINTS_PER_PET: 1,
  XP_PER_PET: 1,
  FAVORITE_ZONE_MULTIPLIER: 1.5,
  MIN_STROKE_PX: 20,
  ZONE_LOCK_MS: 150,
  INTENSITY_DECAY_MS: 800,
  STREAK_MILESTONES: [3, 7, 14, 30],
  // Milestone reward = milestone day count * this value (e.g. 7-day streak => 70 pts).
  STREAK_MILESTONE_BONUS_PER_DAY: 10,
  // Anti-grind: sustained petting depletes "energy" (reward multiplier) toward a
  // floor; pausing recovers it. Keeps farming from being optimal without punishing.
  ANTI_GRIND_ENERGY_FLOOR: 0.3,
  ANTI_GRIND_DEPLETE_PER_PET: 0.05,
  ANTI_GRIND_FULL_RECOVERY_MS: 25000,
  // Local reminder fires daily at this local hour (kept out of quiet hours).
  REMINDER_HOUR: 18,
  REMINDER_MINUTE: 0,
  // Quiet hours: no reminders scheduled between these local hours [start, end).
  QUIET_HOURS_START: 22,
  QUIET_HOURS_END: 8,
} as const;
