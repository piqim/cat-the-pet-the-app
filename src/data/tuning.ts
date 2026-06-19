/**
 * @file tuning
 * @module data/tuning
 *
 * Central game-balance constants. Every reward, timing threshold, and
 * notification schedule reads from here so designers can tune one file
 * without hunting through engine code.
 *
 * Edge cases:
 * - All values are `as const` — changing them requires a code edit and rebuild.
 * - `QUIET_HOURS_START` / `QUIET_HOURS_END` use local device time; a window
 *   that wraps midnight (e.g. 22→8) is handled in notificationService.
 * - Anti-grind energy is session-only (not persisted); these constants only
 *   govern the in-memory depletion/recovery curve.
 *
 * Usage:
 *   import { TUNING } from '../data/tuning';
 *   const pts = TUNING.POINTS_PER_PET * multiplier;
 */

/**
 * Game-balance knobs grouped by subsystem.
 *
 * @property POINTS_PER_PET - Spendable coins granted per qualifying pet stroke.
 * @property XP_PER_PET - Experience granted per qualifying pet stroke.
 * @property FAVORITE_ZONE_MULTIPLIER - Reward multiplier when petting the chin zone.
 * @property MIN_STROKE_PX - Minimum finger travel (px) between frames to count as a stroke.
 * @property ZONE_LOCK_MS - How long a pet zone stays "active" after the last touch.
 * @property INTENSITY_DECAY_MS - Fade time for haptic/purr intensity after petting stops.
 * @property STREAK_MILESTONES - Day-count thresholds that trigger a bonus reward.
 * @property STREAK_MILESTONE_BONUS_PER_DAY - Points per milestone day (e.g. day 7 → 70 pts).
 * @property ANTI_GRIND_ENERGY_FLOOR - Minimum reward multiplier during sustained petting.
 * @property ANTI_GRIND_DEPLETE_PER_PET - Energy lost per pet stroke toward the floor.
 * @property ANTI_GRIND_FULL_RECOVERY_MS - Idle time to fully restore pet energy to 1.0.
 * @property REMINDER_HOUR - Local hour for the daily pet reminder notification.
 * @property REMINDER_MINUTE - Local minute for the daily pet reminder notification.
 * @property QUIET_HOURS_START - Inclusive start of the no-notification window (local hour).
 * @property QUIET_HOURS_END - Exclusive end of the no-notification window (local hour).
 */
export const TUNING = {
  POINTS_PER_PET: 1,
  XP_PER_PET: 1,
  FAVORITE_ZONE_MULTIPLIER: 1.5,
  MIN_STROKE_PX: 20,
  ZONE_LOCK_MS: 150,
  INTENSITY_DECAY_MS: 800,
  STREAK_MILESTONES: [3, 7, 14, 30],
  STREAK_MILESTONE_BONUS_PER_DAY: 10,
  ANTI_GRIND_ENERGY_FLOOR: 0.3,
  ANTI_GRIND_DEPLETE_PER_PET: 0.05,
  ANTI_GRIND_FULL_RECOVERY_MS: 25000,
  REMINDER_HOUR: 18,
  REMINDER_MINUTE: 0,
  QUIET_HOURS_START: 22,
  QUIET_HOURS_END: 8,
} as const;
