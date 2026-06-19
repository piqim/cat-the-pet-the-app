/**
 * @file PointsCounter
 * @module components/PointsCounter
 *
 * Displays the player's current spendable coin balance in the header.
 *
 * Usage:
 *   <PointsCounter points={points} />
 */

import { StyleSheet, Text } from 'react-native';

type PointsCounterProps = {
  /** Current spendable balance from progressStore. */
  points: number;
};

/** Renders "{points} pts" in the header style. */
export function PointsCounter({ points }: PointsCounterProps) {
  return <Text style={styles.text}>{points} pts</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: '#4a3528',
    fontSize: 18,
    fontWeight: '800',
  },
});
