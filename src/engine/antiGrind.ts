/**
 * @file antiGrind
 * @module engine/antiGrind
 *
 * Diminishing-returns model for petting rewards. Sustained petting depletes
 * "energy" toward a floor multiplier; pausing lets energy recover linearly.
 * Removes the incentive to grind without punishing normal play.
 *
 * Edge cases:
 * - First reward (`lastRewardAt === 0`) treats elapsed as infinite → full recovery.
 * - Energy never drops below 0; multiplier never drops below ANTI_GRIND_ENERGY_FLOOR.
 * - Recovery is capped at 1.0 even after long idle periods.
 * - Energy is session-only (not persisted) — each app launch starts at 1.0.
 *
 * Usage:
 *   const { rewardMultiplier, nextEnergy } = computeRewardEnergy(energy, lastAt, Date.now());
 */

import { TUNING } from '../data/tuning';

/** Output of {@link computeRewardEnergy}. */
export type RewardComputation = {
  /** Effective multiplier applied to POINTS_PER_PET and XP_PER_PET (>= floor). */
  rewardMultiplier: number;
  /** Updated energy value to store for the next pet stroke. */
  nextEnergy: number;
};

/**
 * Computes the reward multiplier and next energy after a pet stroke.
 *
 * Recovery: energy increases linearly with idle time up to 1.0.
 * Depletion: energy decreases by ANTI_GRIND_DEPLETE_PER_PET after each reward.
 * Multiplier: `max(ENERGY_FLOOR, recoveredEnergy)`.
 *
 * @param energy - Current session energy in [0, 1].
 * @param lastRewardAt - Timestamp of the previous reward (0 = first reward).
 * @param now - Current timestamp (ms).
 * @returns Reward multiplier and depleted energy for the next stroke.
 *
 * @example
 * // First stroke of a session — full multiplier.
 * computeRewardEnergy(1, 0, Date.now()) // → { rewardMultiplier: 1, nextEnergy: 0.95 }
 */
export function computeRewardEnergy(
  energy: number,
  lastRewardAt: number,
  now: number,
): RewardComputation {
  const elapsed = lastRewardAt > 0 ? now - lastRewardAt : Number.POSITIVE_INFINITY;
  const recovered = Math.min(1, energy + elapsed / TUNING.ANTI_GRIND_FULL_RECOVERY_MS);
  const rewardMultiplier = Math.max(TUNING.ANTI_GRIND_ENERGY_FLOOR, recovered);
  const nextEnergy = Math.max(0, recovered - TUNING.ANTI_GRIND_DEPLETE_PER_PET);

  return { rewardMultiplier, nextEnergy };
}
