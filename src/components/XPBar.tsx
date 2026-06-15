import { StyleSheet, Text, View } from 'react-native';

import { getXpForLevel } from '../data/levelCurve';

type XPBarProps = {
  xp: number;
  level: number;
};

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
