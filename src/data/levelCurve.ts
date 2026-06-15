export function getLevelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 10)) + 1);
}

export function getXpForLevel(level: number): number {
  const normalizedLevel = Math.max(1, level);

  return Math.pow(normalizedLevel - 1, 2) * 10;
}
