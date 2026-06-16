import { TUNING } from '../data/tuning';

export type RewardComputation = {
  rewardMultiplier: number;
  nextEnergy: number;
};

/**
 * Diminishing-returns model (PRD §13 Q3). Energy in [0, 1] recovers linearly
 * while idle and depletes per rewarded pet. The effective reward multiplier is
 * floored so sustained petting always yields *something*, just less than a
 * paced session — removing the incentive to grind.
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
