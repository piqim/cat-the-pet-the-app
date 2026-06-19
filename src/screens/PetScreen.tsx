/**
 * @file PetScreen
 * @module screens/PetScreen
 *
 * Main game screen: orchestrates petting gestures, rewards, animation, audio,
 * haptics, daily streak, shop, settings, and onboarding name prompt.
 *
 * Edge cases:
 * - dailyOpenHandledRef ensures registerDailyOpen runs once per session.
 * - ZONE_LOCK_MS throttles rewards to prevent rapid-fire coin farming.
 * - Touch outside sprite bounds resets to idle and clears stroke anchor.
 * - Negative zones (eyes) play annoyed haptic and reset goodStrokeCount.
 * - Chin zone uses FAVORITE_ZONE_MULTIPLIER for bonus rewards.
 * - Cat size scales to catAreaWidth (max 340px) for larger hit targets.
 * - __DEV__ overlay and debug text gated behind development builds.
 *
 * Usage:
 *   <PetScreen />  // rendered from App.tsx
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { CatSprite } from '../components/CatSprite';
import { NamePrompt } from '../components/NamePrompt';
import { PetZonesOverlay } from '../components/PetZonesOverlay';
import { PointsCounter } from '../components/PointsCounter';
import { SettingsSheet } from '../components/SettingsSheet';
import { Shop } from '../components/shop';
import { StreakCelebration } from '../components/StreakCelebration';
import { XPBar } from '../components/XPBar';
import { getCosmeticById } from '../data/cosmetics';
import { TUNING } from '../data/tuning';
import {
  CatAnimationState,
  getAnimationStateForPet,
  getReleaseAnimationState,
} from '../engine/animationController';
import { audioEngine } from '../engine/AudioEngine';
import { expoHapticEngine, HapticPattern } from '../engine/HapticEngine';
import { PetZoneId, Point } from '../engine/hitTest';
import { createPetEvent, SpriteBounds } from '../engine/petController';
import { cancelDailyPetReminder, scheduleDailyPetReminder } from '../services/notificationService';
import { useCosmeticsStore } from '../stores/cosmeticsStore';
import { useProgressStore } from '../stores/progressStore';
import { useSettingsStore } from '../stores/settingsStore';

/** Maximum rendered cat sprite size in screen pixels. */
const MAX_CAT_SIZE = 340;
/** Vertical offset of the cat sprite within the petting area. */
const CAT_TOP_MARGIN = 24;

/** Maps each pet zone to a haptic pattern for tactile feedback. */
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

/** Main game screen composing all gameplay systems. */
export function PetScreen() {
  const [catAreaWidth, setCatAreaWidth] = useState(0);
  const [activeZoneId, setActiveZoneId] = useState<PetZoneId>();
  const [animationState, setAnimationState] = useState<CatAnimationState>('idle');
  const strokeAnchorRef = useRef<Point | undefined>(undefined);
  const goodStrokeCountRef = useRef(0);
  const lastRewardAtRef = useRef(0);
  const releaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dailyOpenHandledRef = useRef(false);
  const [shopVisible, setShopVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [namePromptVisible, setNamePromptVisible] = useState(false);
  const [celebration, setCelebration] = useState<{ streak: number; rewardPoints: number }>();
  const {
    catName,
    hasNamedCat,
    points,
    xp,
    level,
    currentStreak,
    nameCat,
    grantPetReward,
    registerDailyOpen,
  } = useProgressStore();
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const equippedScene = useCosmeticsStore((state) => state.equipped.scene);
  const sceneBackground = getCosmeticById(equippedScene)?.backgroundColor ?? '#fff2df';

  useEffect(() => {
    if (dailyOpenHandledRef.current) {
      return;
    }

    dailyOpenHandledRef.current = true;
    const result = registerDailyOpen();

    if (result.hitMilestone) {
      setCelebration({ streak: result.currentStreak, rewardPoints: result.rewardPoints });
    }

    if (!useProgressStore.getState().hasNamedCat) {
      setNamePromptVisible(true);
    }
  }, [registerDailyOpen]);

  useEffect(() => {
    expoHapticEngine.setEnabled(hapticsEnabled);
  }, [hapticsEnabled]);

  useEffect(() => {
    if (notificationsEnabled) {
      void scheduleDailyPetReminder();
    } else {
      void cancelDailyPetReminder();
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    void audioEngine.start();
  }, []);

  useEffect(() => {
    audioEngine.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    audioEngine.setPurrLevel(getPurrLevel(animationState));
  }, [animationState]);

  const catSize = catAreaWidth > 0 ? Math.min(catAreaWidth, MAX_CAT_SIZE) : MAX_CAT_SIZE;

  const spriteBounds = useMemo<SpriteBounds>(
    () => ({
      x: Math.max(0, (catAreaWidth - catSize) / 2),
      y: CAT_TOP_MARGIN,
      size: catSize,
    }),
    [catAreaWidth, catSize],
  );

  /**
   * Processes a single pet gesture frame: hit-test, animate, haptic, reward.
   * Called from the UI thread via runOnJS on pan begin/update.
   */
  const handlePetMove = useCallback(
    (x: number, y: number) => {
      if (releaseTimeoutRef.current) {
        clearTimeout(releaseTimeoutRef.current);
        releaseTimeoutRef.current = undefined;
      }

      const point = { x, y };
      const petEvent = createPetEvent(point, strokeAnchorRef.current, spriteBounds);

      if (!petEvent) {
        strokeAnchorRef.current = undefined;
        setActiveZoneId(undefined);
        setAnimationState('idle');
        return;
      }

      if (!strokeAnchorRef.current) {
        strokeAnchorRef.current = point;
      }

      if (!petEvent.zone) {
        setActiveZoneId(undefined);
        setAnimationState((previousState) =>
          getAnimationStateForPet({
            previousState,
            goodStrokeCount: goodStrokeCountRef.current,
            isStroke: petEvent.isStroke,
          }),
        );
        return;
      }

      setActiveZoneId(petEvent.zone.id);
      setAnimationState((previousState) =>
        getAnimationStateForPet({
          previousState,
          zoneId: petEvent.zone?.id,
          goodStrokeCount: goodStrokeCountRef.current,
          isStroke: petEvent.isStroke,
        }),
      );

      if (!petEvent.isStroke) {
        return;
      }

      const now = Date.now();

      if (now - lastRewardAtRef.current < TUNING.ZONE_LOCK_MS) {
        return;
      }

      lastRewardAtRef.current = now;
      strokeAnchorRef.current = point;
      void expoHapticEngine.playPattern(HAPTIC_PATTERN_BY_ZONE[petEvent.zone.id]);

      if (!petEvent.zone.isNegative) {
        goodStrokeCountRef.current += 1;
        setAnimationState((previousState) =>
          getAnimationStateForPet({
            previousState,
            zoneId: petEvent.zone?.id,
            goodStrokeCount: goodStrokeCountRef.current,
            isStroke: true,
          }),
        );
        grantPetReward(petEvent.zone.id === 'chin' ? TUNING.FAVORITE_ZONE_MULTIPLIER : 1);
      } else {
        goodStrokeCountRef.current = 0;
      }
    },
    [grantPetReward, spriteBounds],
  );

  /** Handles finger lift: reset stroke state, play release animation, fade to idle. */
  const handlePetEnd = useCallback(() => {
    strokeAnchorRef.current = undefined;
    goodStrokeCountRef.current = 0;
    setActiveZoneId(undefined);
    setAnimationState((previousState) => getReleaseAnimationState(previousState));
    releaseTimeoutRef.current = setTimeout(() => {
      setAnimationState('idle');
      releaseTimeoutRef.current = undefined;
    }, TUNING.INTENSITY_DECAY_MS);
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
        <Pressable onPress={() => setNamePromptVisible(true)} hitSlop={8}>
          <Text style={styles.catName}>{catName}</Text>
          <Text style={styles.subtitle}>Pet gently. Avoid the eyes.</Text>
        </Pressable>
        <View style={styles.headerRight}>
          <View style={styles.headerTopRow}>
            <View style={styles.streakPill}>
              <Text style={styles.streakText}>{'\u{1F525}'} {currentStreak}</Text>
            </View>
            <Pressable
              style={styles.iconButton}
              onPress={() => setSettingsVisible(true)}
              hitSlop={8}
            >
              <Text style={styles.iconButtonText}>{'\u2699'}</Text>
            </Pressable>
          </View>
          <PointsCounter points={points} />
        </View>
      </View>

      <XPBar xp={xp} level={level} />

      {celebration ? (
        <StreakCelebration
          streak={celebration.streak}
          rewardPoints={celebration.rewardPoints}
          onDismiss={() => setCelebration(undefined)}
        />
      ) : null}

      <GestureDetector gesture={panGesture}>
        <View
          style={[
            styles.catArea,
            { backgroundColor: sceneBackground, height: catSize + CAT_TOP_MARGIN * 2 },
          ]}
          onLayout={(event) => setCatAreaWidth(event.nativeEvent.layout.width)}
        >
          <View
            style={[
              styles.catStage,
              { width: catSize, height: catSize, left: spriteBounds.x, top: spriteBounds.y },
            ]}
          >
            <CatSprite activeZoneId={activeZoneId} animationState={animationState} size={catSize} />
            {__DEV__ ? <PetZonesOverlay size={catSize} activeZoneId={activeZoneId} /> : null}
          </View>
        </View>
      </GestureDetector>

      <Pressable style={styles.shopButton} onPress={() => setShopVisible(true)}>
        <Text style={styles.shopButtonText}>Open Shop</Text>
      </Pressable>

      {__DEV__ ? (
        <Text style={styles.debugText}>
          Active zone: {activeZoneId ? activeZoneId : 'none'} | State: {animationState}
        </Text>
      ) : null}

      <Shop visible={shopVisible} onClose={() => setShopVisible(false)} />

      <SettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onRenameCat={() => {
          setSettingsVisible(false);
          setNamePromptVisible(true);
        }}
      />

      <NamePrompt
        visible={namePromptVisible}
        initialName={catName}
        isOnboarding={!hasNamedCat}
        onSubmit={nameCat}
        onClose={() => setNamePromptVisible(false)}
      />
    </View>
  );
}

/**
 * Maps cat animation state to purr audio volume (0–1).
 *
 * @param animationState - Current animation state from animationController.
 * @returns Purr level for audioEngine.setPurrLevel.
 */
function getPurrLevel(animationState: CatAnimationState): number {
  switch (animationState) {
    case 'purringPeak':
      return 1;
    case 'beingPetted':
      return 0.6;
    case 'postPet':
      return 0.3;
    default:
      return 0;
  }
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
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#f0e2cf',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  iconButtonText: {
    color: '#7d604d',
    fontSize: 18,
  },
  streakPill: {
    backgroundColor: '#ffe0c2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  streakText: {
    color: '#a85a2a',
    fontSize: 14,
    fontWeight: '800',
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
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  shopButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#4a3528',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  shopButtonText: {
    color: '#fff2df',
    fontSize: 16,
    fontWeight: '800',
  },
  catStage: {
    position: 'absolute',
  },
  debugText: {
    color: '#7d604d',
    fontSize: 14,
    textAlign: 'center',
  },
});
