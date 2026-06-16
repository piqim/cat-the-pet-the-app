import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type StreakCelebrationProps = {
  streak: number;
  rewardPoints: number;
  onDismiss: () => void;
};

export function StreakCelebration({ streak, rewardPoints, onDismiss }: StreakCelebrationProps) {
  useEffect(() => {
    const timeoutId = setTimeout(onDismiss, 4000);

    return () => clearTimeout(timeoutId);
  }, [onDismiss]);

  return (
    <Pressable style={styles.root} onPress={onDismiss}>
      <Text style={styles.sparkle}>{'\u2728'}</Text>
      <View style={styles.copy}>
        <Text style={styles.title}>{streak}-day streak!</Text>
        <Text style={styles.subtitle}>+{rewardPoints} bonus points</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: '#ffe6a8',
    borderColor: '#f2b65a',
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sparkle: {
    fontSize: 28,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: '#4a3528',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: '#7d604d',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
});
