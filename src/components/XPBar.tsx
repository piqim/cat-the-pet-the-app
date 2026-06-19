/**
 * @file XPBar
 * @module components/XPBar
 *
 * Level label and progress bar toward the next level. Progress is computed
 * from XP thresholds in levelCurve (quadratic curve).
 *
 * Edge cases:
 * - Progress is clamped to [0, 1] even if XP exceeds next threshold.
 * - At max practical level the bar shows full (denominator still valid).
 *
 * Usage:
 *   <XPBar xp={xp} level={level} />
 */

import { StyleSheet, Text, View } from 'react-native';

import { getXpForLevel } from '../data/levelCurve';

type XPBarProps = {
  /** Total accumulated XP. */
  xp: number;
  /** Current player level (derived from XP). */
  level: number;
};

/** Level number and fill bar showing progress to the next level. */
export function XPBar({ xp, level }: XPBarProps) {
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  const progress = Math.min(1, (xp - currentLevelXp) / (nextLevelXp - currentLevelXp));

  return (
    <View style={styles.root}>
      <Text style={styles.label}>Level {level}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
  },
  label: {
    color: '#4a3528',
    fontSize: 16,
    fontWeight: '700',
  },
  track: {
    backgroundColor: '#ead4bd',
    borderRadius: 999,
    height: 12,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: '#f29f61',
    height: '100%',
  },
});
