/**
 * @file CatSprite
 * @module components/CatSprite
 *
 * Layer-separated placeholder cat rendered with Skia primitives. Each draw
 * group maps to a future art layer (body, tail, ears, face) per PRD §5.1.
 * Reacts to animation state and shows equipped cosmetic placeholders.
 *
 * Edge cases:
 * - Placeholder palette/glyphs replaced when final PNG layers ship.
 * - Idle blink on last frame of 4-frame idle cycle.
 * - Cosmetic layers are View overlays (not Skia) until real art is wired.
 * - reactionGlow is a non-interactive View overlay for mood tinting.
 *
 * Usage:
 *   <CatSprite activeZoneId={zone} animationState={state} size={340} />
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Canvas,
  Circle,
  Group,
  Line,
  Oval,
  Path,
  vec,
} from '@shopify/react-native-skia';
import { StyleSheet, Text, View } from 'react-native';

import { Cosmetic, getCosmeticById } from '../data/cosmetics';
import { CatAnimationState } from '../engine/animationController';
import { PetZoneId } from '../engine/hitTest';
import { useCosmeticsStore } from '../stores/cosmeticsStore';

const IDLE_FRAME_COUNT = 4;
const IDLE_FRAME_MS = 220;

// Placeholder palette — replaced when the layer-separated PNGs ship (PRD §10).
const COLORS = {
  outline: '#3a2a1e',
  fur: '#e8a572',
  belly: '#f7dcb6',
  earInner: '#e98b9b',
  eye: '#2e2118',
  nose: '#d6748a',
  whisker: '#6b5240',
  blush: 'rgba(233, 139, 155, 0.55)',
};

type CatSpriteProps = {
  activeZoneId?: PetZoneId;
  animationState: CatAnimationState;
  /** Rendered width and height in screen pixels. */
  size: number;
};

/** Main cat sprite with Skia body, cosmetic overlays, and reaction transforms. */
export function CatSprite({ activeZoneId, animationState, size }: CatSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const equipped = useCosmeticsStore((state) => state.equipped);
  const headCosmetic = getCosmeticById(equipped.head);
  const collarCosmetic = getCosmeticById(equipped.collar);
  const reactionStyle = useMemo(
    () => getReactionStyle(animationState, activeZoneId, frameIndex),
    [activeZoneId, animationState, frameIndex],
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setFrameIndex((currentFrame) => (currentFrame + 1) % IDLE_FRAME_COUNT);
    }, IDLE_FRAME_MS);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <View style={[styles.root, { width: size, height: size }, reactionStyle]}>
      <Canvas style={{ width: size, height: size }}>
        <PlaceholderCat size={size} animationState={animationState} frameIndex={frameIndex} />
      </Canvas>
      {headCosmetic ? <CosmeticLayer cosmetic={headCosmetic} slotStyle={styles.headLayer} /> : null}
      {collarCosmetic ? (
        <CosmeticLayer cosmetic={collarCosmetic} slotStyle={styles.collarLayer} />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          styles.reactionGlow,
          animationState === 'annoyed' && styles.annoyedGlow,
          animationState === 'purringPeak' && styles.purringGlow,
        ]}
      />
    </View>
  );
}

type EyeMode = 'open' | 'wide' | 'half' | 'squint' | 'slit' | 'closed';
type EarMode = 'idle' | 'perk' | 'flat';
type TailMode = 'sway' | 'wrap' | 'stiff';

/**
 * Skia-drawn placeholder cat with layered body parts.
 * Maps 1:1 to future PNG art layers for production swap.
 */
function PlaceholderCat({
  size,
  animationState,
  frameIndex,
}: {
  size: number;
  animationState: CatAnimationState;
  frameIndex: number;
}) {
  const s = size;
  const eyeMode = getEyeMode(animationState, frameIndex);
  const earMode = getEarMode(animationState);
  const tailMode = getTailMode(animationState);
  const breatheScale = frameIndex % 2 === 0 ? 1.012 : 0.992;
  const showBlush = animationState === 'purringPeak' || animationState === 'streakMilestone';
  const whiskerSpread = showBlush ? 0.05 : 0;

  return (
    <Group>
      <TailLayer s={s} mode={tailMode} frameIndex={frameIndex} />

      {/* Layer 2 — body (incl. front paws), with subtle breathing scale. */}
      <Group origin={vec(0.5 * s, 0.66 * s)} transform={[{ scaleY: breatheScale }]}>
        <Oval x={0.17 * s} y={0.32 * s} width={0.66 * s} height={0.64 * s} color={COLORS.fur} />
        <Oval x={0.31 * s} y={0.52 * s} width={0.38 * s} height={0.42 * s} color={COLORS.belly} />
        <Oval x={0.34 * s} y={0.86 * s} width={0.14 * s} height={0.11 * s} color={COLORS.fur} />
        <Oval x={0.52 * s} y={0.86 * s} width={0.14 * s} height={0.11 * s} color={COLORS.fur} />
      </Group>

      <EarsLayer s={s} mode={earMode} />
      <FaceLayer
        s={s}
        eyeMode={eyeMode}
        showBlush={showBlush}
        annoyed={animationState === 'annoyed'}
        whiskerSpread={whiskerSpread}
      />
    </Group>
  );
}

/** Animated tail path with sway, wrap, or stiff modes. */
function TailLayer({ s, mode, frameIndex }: { s: number; mode: TailMode; frameIndex: number }) {
  const swayAngle = (frameIndex - 1.5) * 0.07;
  const angle = mode === 'wrap' ? -0.55 : mode === 'stiff' ? -0.25 : swayAngle;
  const path =
    mode === 'wrap'
      ? `M ${0.7 * s} ${0.82 * s} C ${0.86 * s} ${0.9 * s} ${0.78 * s} ${0.66 * s} ${0.6 * s} ${0.7 * s}`
      : `M ${0.72 * s} ${0.82 * s} C ${0.92 * s} ${0.84 * s} ${0.95 * s} ${0.66 * s} ${0.9 * s} ${0.52 * s}`;

  return (
    <Group origin={vec(0.72 * s, 0.82 * s)} transform={[{ rotate: angle }]}>
      <Path
        path={path}
        start={0}
        end={1}
        style="stroke"
        strokeWidth={0.11 * s}
        strokeCap="round"
        color={COLORS.fur}
      />
    </Group>
  );
}

/** Left and right ear triangles with perk/flat/idle positioning. */
function EarsLayer({ s, mode }: { s: number; mode: EarMode }) {
  // Apex lift/spread differs per mode: perk raises + spreads, flat drops back.
  const lift = mode === 'perk' ? 0.05 : mode === 'flat' ? -0.05 : 0;
  const spread = mode === 'perk' ? 0.02 : mode === 'flat' ? 0.04 : 0;

  const leftApex = { x: (0.24 - spread) * s, y: (0.2 - lift) * s };
  const rightApex = { x: (0.76 + spread) * s, y: (0.2 - lift) * s };

  const leftOuter = `M ${0.2 * s} ${0.4 * s} L ${leftApex.x} ${leftApex.y} L ${0.36 * s} ${0.36 * s} Z`;
  const rightOuter = `M ${0.8 * s} ${0.4 * s} L ${rightApex.x} ${rightApex.y} L ${0.64 * s} ${0.36 * s} Z`;
  const leftInner = `M ${0.24 * s} ${0.38 * s} L ${leftApex.x + 0.01 * s} ${leftApex.y + 0.04 * s} L ${0.33 * s} ${0.35 * s} Z`;
  const rightInner = `M ${0.76 * s} ${0.38 * s} L ${rightApex.x - 0.01 * s} ${rightApex.y + 0.04 * s} L ${0.67 * s} ${0.35 * s} Z`;

  return (
    <Group>
      <Path path={leftOuter} start={0} end={1} color={COLORS.fur} />
      <Path path={rightOuter} start={0} end={1} color={COLORS.fur} />
      <Path path={leftInner} start={0} end={1} color={COLORS.earInner} />
      <Path path={rightInner} start={0} end={1} color={COLORS.earInner} />
    </Group>
  );
}

/** Eyes, nose, whiskers, blush, and annoyed brow lines. */
function FaceLayer({
  s,
  eyeMode,
  showBlush,
  annoyed,
  whiskerSpread,
}: {
  s: number;
  eyeMode: EyeMode;
  showBlush: boolean;
  annoyed: boolean;
  whiskerSpread: number;
}) {
  const eyeY = 0.54 * s;
  const leftEyeX = 0.4 * s;
  const rightEyeX = 0.6 * s;
  const noseY = 0.63 * s;

  return (
    <Group>
      {showBlush ? (
        <Group>
          <Circle cx={0.32 * s} cy={0.6 * s} r={0.035 * s} color={COLORS.blush} />
          <Circle cx={0.68 * s} cy={0.6 * s} r={0.035 * s} color={COLORS.blush} />
        </Group>
      ) : null}

      {renderEye(leftEyeX, eyeY, s, eyeMode)}
      {renderEye(rightEyeX, eyeY, s, eyeMode)}

      {annoyed ? (
        <Group>
          <Line
            p1={vec(0.33 * s, 0.46 * s)}
            p2={vec(0.43 * s, 0.49 * s)}
            color={COLORS.outline}
            style="stroke"
            strokeWidth={0.018 * s}
            strokeCap="round"
          />
          <Line
            p1={vec(0.67 * s, 0.46 * s)}
            p2={vec(0.57 * s, 0.49 * s)}
            color={COLORS.outline}
            style="stroke"
            strokeWidth={0.018 * s}
            strokeCap="round"
          />
        </Group>
      ) : null}

      {/* Nose */}
      <Path
        path={`M ${0.47 * s} ${noseY} L ${0.53 * s} ${noseY} L ${0.5 * s} ${noseY + 0.03 * s} Z`}
        start={0}
        end={1}
        color={COLORS.nose}
      />

      {/* Whiskers (spread wider during bliss). */}
      <Line
        p1={vec(0.42 * s, noseY)}
        p2={vec((0.22 - whiskerSpread) * s, (0.6 - whiskerSpread) * s)}
        color={COLORS.whisker}
        style="stroke"
        strokeWidth={0.012 * s}
        strokeCap="round"
      />
      <Line
        p1={vec(0.42 * s, noseY + 0.02 * s)}
        p2={vec((0.22 - whiskerSpread) * s, (0.66 + whiskerSpread) * s)}
        color={COLORS.whisker}
        style="stroke"
        strokeWidth={0.012 * s}
        strokeCap="round"
      />
      <Line
        p1={vec(0.58 * s, noseY)}
        p2={vec((0.78 + whiskerSpread) * s, (0.6 - whiskerSpread) * s)}
        color={COLORS.whisker}
        style="stroke"
        strokeWidth={0.012 * s}
        strokeCap="round"
      />
      <Line
        p1={vec(0.58 * s, noseY + 0.02 * s)}
        p2={vec((0.78 + whiskerSpread) * s, (0.66 + whiskerSpread) * s)}
        color={COLORS.whisker}
        style="stroke"
        strokeWidth={0.012 * s}
        strokeCap="round"
      />
    </Group>
  );
}

/**
 * Renders a single eye in the given mode.
 *
 * @param cx - Eye center X (sprite pixels).
 * @param cy - Eye center Y (sprite pixels).
 * @param s - Sprite size.
 * @param mode - Eye expression mode.
 */
function renderEye(cx: number, cy: number, s: number, mode: EyeMode) {
  const stroke = 0.022 * s;

  switch (mode) {
    case 'closed':
      return (
        <Path
          key={cx}
          path={`M ${cx - 0.05 * s} ${cy} Q ${cx} ${cy + 0.03 * s} ${cx + 0.05 * s} ${cy}`}
          start={0}
          end={1}
          style="stroke"
          strokeWidth={stroke}
          strokeCap="round"
          color={COLORS.eye}
        />
      );
    case 'squint':
      return (
        <Path
          key={cx}
          path={`M ${cx - 0.055 * s} ${cy + 0.02 * s} Q ${cx} ${cy - 0.04 * s} ${cx + 0.055 * s} ${cy + 0.02 * s}`}
          start={0}
          end={1}
          style="stroke"
          strokeWidth={stroke}
          strokeCap="round"
          color={COLORS.eye}
        />
      );
    case 'slit':
      return (
        <Oval
          key={cx}
          x={cx - 0.045 * s}
          y={cy - 0.012 * s}
          width={0.09 * s}
          height={0.024 * s}
          color={COLORS.eye}
        />
      );
    case 'half':
      return (
        <Oval
          key={cx}
          x={cx - 0.04 * s}
          y={cy - 0.025 * s}
          width={0.08 * s}
          height={0.05 * s}
          color={COLORS.eye}
        />
      );
    case 'wide':
      return (
        <Group key={cx}>
          <Oval x={cx - 0.05 * s} y={cy - 0.075 * s} width={0.1 * s} height={0.15 * s} color={COLORS.eye} />
          <Circle cx={cx + 0.018 * s} cy={cy - 0.03 * s} r={0.016 * s} color="#fff" />
        </Group>
      );
    case 'open':
    default:
      return (
        <Group key={cx}>
          <Oval x={cx - 0.04 * s} y={cy - 0.055 * s} width={0.08 * s} height={0.11 * s} color={COLORS.eye} />
          <Circle cx={cx + 0.015 * s} cy={cy - 0.025 * s} r={0.013 * s} color="#fff" />
        </Group>
      );
  }
}

/**
 * Maps animation state + idle frame to an eye expression.
 *
 * @param animationState - Current cat animation state.
 * @param frameIndex - Idle animation frame (0–3).
 */
function getEyeMode(animationState: CatAnimationState, frameIndex: number): EyeMode {
  switch (animationState) {
    case 'noticing':
      return 'wide';
    case 'beingPetted':
      return 'half';
    case 'purringPeak':
    case 'streakMilestone':
      return 'squint';
    case 'postPet':
      return frameIndex % 2 === 0 ? 'closed' : 'half';
    case 'annoyed':
      return 'slit';
    case 'idle':
    default:
      // Occasional slow blink on the last idle frame.
      return frameIndex === IDLE_FRAME_COUNT - 1 ? 'closed' : 'open';
  }
}

/** Maps animation state to ear posture (idle / perk / flat). */
function getEarMode(animationState: CatAnimationState): EarMode {
  switch (animationState) {
    case 'annoyed':
      return 'flat';
    case 'noticing':
    case 'beingPetted':
    case 'purringPeak':
    case 'streakMilestone':
      return 'perk';
    default:
      return 'idle';
  }
}

/** Maps animation state to tail motion mode (sway / wrap / stiff). */
function getTailMode(animationState: CatAnimationState): TailMode {
  switch (animationState) {
    case 'purringPeak':
    case 'streakMilestone':
      return 'wrap';
    case 'annoyed':
      return 'stiff';
    default:
      return 'sway';
  }
}

/**
 * Whole-sprite transform style for the current animation reaction.
 * Applied to the root View wrapping Canvas + cosmetics.
 */
function getReactionStyle(
  animationState: CatAnimationState,
  activeZoneId: PetZoneId | undefined,
  frameIndex: number,
) {
  const pulse = frameIndex % 2 === 0 ? 1 : -1;

  switch (animationState) {
    case 'noticing':
      return {
        transform: [{ translateY: -2 }, { scale: 1.02 }],
      };
    case 'beingPetted':
      return {
        transform: [
          { translateX: getZoneLean(activeZoneId) * 4 },
          { translateY: pulse },
          { rotate: `${getZoneLean(activeZoneId) * 1.5}deg` },
          { scale: 1.03 },
        ],
      };
    case 'purringPeak':
      return {
        transform: [
          { translateX: getZoneLean(activeZoneId) * 5 },
          { translateY: pulse * 2 },
          { scale: 1.06 },
        ],
      };
    case 'annoyed':
      return {
        transform: [{ translateX: pulse * 4 }, { rotate: `${pulse * 2}deg` }],
      };
    case 'postPet':
      return {
        transform: [{ translateY: 1 }, { scale: 1.01 }],
      };
    case 'streakMilestone':
      return {
        transform: [{ translateY: -4 }, { scale: 1.08 }],
      };
    case 'idle':
    default:
      return {
        transform: [{ scale: 1 }],
      };
  }
}

/**
 * Horizontal lean direction based on which side of the cat is being petted.
 *
 * @param activeZoneId - Currently active pet zone.
 * @returns -1 (left), 0 (center), or 1 (right).
 */
function getZoneLean(activeZoneId: PetZoneId | undefined): number {
  switch (activeZoneId) {
    case 'leftChest':
    case 'leftEar':
    case 'leftPaw':
      return -1;
    case 'rightChest':
    case 'rightEar':
    case 'rightPaw':
      return 1;
    default:
      return 0;
  }
}

/** Placeholder cosmetic overlay (glyph on swatch chip) until real art ships. */
function CosmeticLayer({
  cosmetic,
  slotStyle,
}: {
  cosmetic: Cosmetic;
  slotStyle: object;
}) {
  return (
    <View pointerEvents="none" style={[styles.cosmeticLayer, slotStyle]}>
      <View style={[styles.cosmeticChip, { backgroundColor: cosmetic.swatch }]}>
        {cosmetic.glyph ? <Text style={styles.cosmeticGlyph}>{cosmetic.glyph}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  reactionGlow: {
    borderRadius: 24,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  annoyedGlow: {
    backgroundColor: 'rgba(184, 72, 72, 0.12)',
  },
  purringGlow: {
    backgroundColor: 'rgba(255, 214, 102, 0.16)',
  },
  cosmeticLayer: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  headLayer: {
    top: '6%',
  },
  collarLayer: {
    top: '70%',
  },
  cosmeticChip: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cosmeticGlyph: {
    fontSize: 22,
  },
});
