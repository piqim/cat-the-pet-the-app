/**
 * @file levelCurve
 * @module data/levelCurve
 *
 * Maps experience points to player level and back. Uses a quadratic curve so
 * early levels arrive quickly and later levels require more petting.
 *
 * Edge cases:
 * - Negative XP is clamped to 0 before level calculation (corrupt saves).
 * - Level is always >= 1 regardless of input.
 * - `getXpForLevel(1)` returns 0 (level 1 is the starting tier).
 *
 * Usage:
 *   const level = getLevelForXp(150);   // → 4
 *   const xpNeeded = getXpForLevel(5);  // → 160
 */

/**
 * Derives the player level from total accumulated XP.
 *
 * Formula: `level = floor(sqrt(xp / 10)) + 1`, clamped to a minimum of 1.
 *
 * @param xp - Total experience points earned (may be negative; clamped to 0).
 * @returns Integer level, always >= 1.
 *
 * @example
 * getLevelForXp(0)   // → 1
 * getLevelForXp(90)  // → 4  (sqrt(9) + 1)
 * getLevelForXp(-5)  // → 1  (negative clamped)
 */
export function getLevelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 10)) + 1);
}

/**
 * Returns the minimum XP required to reach a given level.
 *
 * Inverse of `getLevelForXp`: `xp = (level - 1)² × 10`.
 *
 * @param level - Target level (values < 1 are treated as 1).
 * @returns XP threshold for that level.
 *
 * @example
 * getXpForLevel(1)  // → 0
 * getXpForLevel(5)  // → 160  ((5-1)² × 10)
 */
export function getXpForLevel(level: number): number {
  const normalizedLevel = Math.max(1, level);

  return Math.pow(normalizedLevel - 1, 2) * 10;
}
