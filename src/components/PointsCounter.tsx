import { StyleSheet, Text } from 'react-native';

type PointsCounterProps = {
  points: number;
};

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
