import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { CatSprite } from '../components/CatSprite';
import { PetZonesOverlay } from '../components/PetZonesOverlay';
import { PointsCounter } from '../components/PointsCounter';
import { XPBar } from '../components/XPBar';
import { TUNING } from '../data/tuning';
import { expoHapticEngine, HapticPattern } from '../engine/HapticEngine';
import { PetZoneId, Point } from '../engine/hitTest';
import { createPetEvent, SpriteBounds } from '../engine/petController';
import { useProgressStore } from '../stores/progressStore';

const CAT_SIZE = 256;

const HAPTIC_PATTERN_BY_ZONE: Record<PetZoneId, HapticPattern> = {
  leftPaw: 'paw',
  leftChest: 'chest',
  rightChest: 'chest',
  rightPaw: 'paw',
  chin: 'chin',
  forehead: 'forehead',
  leftEar: 'ear',
  rightEar: 'ear',
  eyes: 'annoyed',
};

export function PetScreen() {
  const [catAreaWidth, setCatAreaWidth] = useState(0);
  const [activeZoneId, setActiveZoneId] = useState<PetZoneId>();
  const previousPointRef = useRef<Point | undefined>(undefined);
  const lastRewardAtRef = useRef(0);
  const { catName, points, xp, level, grantPetReward } = useProgressStore();

  const spriteBounds = useMemo<SpriteBounds>(
    () => ({
      x: Math.max(0, (catAreaWidth - CAT_SIZE) / 2),
      y: 32,
      size: CAT_SIZE,
    }),
    [catAreaWidth],
  );

  const handlePetMove = useCallback(
    (x: number, y: number) => {
      const point = { x, y };
      const petEvent = createPetEvent(point, previousPointRef.current, spriteBounds);
      previousPointRef.current = point;

      if (!petEvent?.zone) {
        setActiveZoneId(undefined);
        return;
      }

      setActiveZoneId(petEvent.zone.id);

      if (!petEvent.isStroke) {
        return;
      }

      const now = Date.now();

      if (now - lastRewardAtRef.current < TUNING.ZONE_LOCK_MS) {
        return;
      }

      lastRewardAtRef.current = now;
      void expoHapticEngine.playPattern(HAPTIC_PATTERN_BY_ZONE[petEvent.zone.id]);

      if (!petEvent.zone.isNegative) {
        grantPetReward(petEvent.zone.id === 'chin' ? TUNING.FAVORITE_ZONE_MULTIPLIER : 1);
      }
    },
    [grantPetReward, spriteBounds],
  );

  const handlePetEnd = useCallback(() => {
    previousPointRef.current = undefined;
    setActiveZoneId(undefined);
    void expoHapticEngine.stop();
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((event) => {
          runOnJS(handlePetMove)(event.x, event.y);
        })
        .onUpdate((event) => {
          runOnJS(handlePetMove)(event.x, event.y);
        })
        .onEnd(() => {
          runOnJS(handlePetEnd)();
        })
        .onFinalize(() => {
          runOnJS(handlePetEnd)();
        }),
    [handlePetEnd, handlePetMove],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.catName}>{catName}</Text>
          <Text style={styles.subtitle}>Pet gently. Avoid the eyes.</Text>
        </View>
        <PointsCounter points={points} />
      </View>

      <XPBar xp={xp} level={level} />

      <GestureDetector gesture={panGesture}>
        <View
          style={styles.catArea}
          onLayout={(event) => setCatAreaWidth(event.nativeEvent.layout.width)}
        >
          <View style={[styles.catStage, { left: spriteBounds.x, top: spriteBounds.y }]}>
            <CatSprite size={CAT_SIZE} />
            <PetZonesOverlay size={CAT_SIZE} activeZoneId={activeZoneId} />
          </View>
        </View>
      </GestureDetector>

      <Text style={styles.debugText}>
        Active zone: {activeZoneId ? activeZoneId : 'none'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#fff2df',
    flex: 1,
    gap: 18,
    padding: 24,
    paddingTop: 72,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catName: {
    color: '#4a3528',
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: '#7d604d',
    fontSize: 14,
    marginTop: 4,
  },
  catArea: {
    height: 336,
    position: 'relative',
  },
  catStage: {
    height: CAT_SIZE,
    position: 'absolute',
    width: CAT_SIZE,
  },
  debugText: {
    color: '#7d604d',
    fontSize: 14,
    textAlign: 'center',
  },
});
