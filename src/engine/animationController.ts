/**
 * @file animationController
 * @module engine/animationController
 *
 * Pure state machine that maps petting input to a cat animation state.
 * Consumed by CatSprite for visual reactions and by PetScreen for purr level.
 *
 * Edge cases:
 * - Touching the `eyes` zone always returns `'annoyed'` regardless of stroke.
 * - A touch without enough movement (`isStroke: false`) holds the previous
 *   state (or `'noticing'` if coming from idle).
 * - Lifting a finger after annoyed stays annoyed; otherwise transitions to postPet.
 * - `streakMilestone` is set externally by PetScreen, not by this controller.
 *
 * Usage:
 *   const state = getAnimationStateForPet({ zoneId, isStroke, goodStrokeCount, previousState });
 */

import { PetZoneId } from './hitTest';

/** All visual states the cat sprite can render. */
export type CatAnimationState =
  | 'idle'
  | 'noticing'
  | 'beingPetted'
  | 'purringPeak'
  | 'postPet'
  | 'annoyed'
  | 'streakMilestone';

/** Input snapshot for one petting frame. */
export type AnimationInput = {
  zoneId?: PetZoneId;
  isStroke: boolean;
  goodStrokeCount: number;
  previousState: CatAnimationState;
};

/** Consecutive good strokes required to reach purringPeak. */
const PURRING_PEAK_STROKES = 5;

/**
 * Determines the cat's animation state for the current petting frame.
 *
 * @param input - Zone, stroke flag, cumulative good strokes, and prior state.
 * @returns The animation state CatSprite should render.
 *
 * @example
 * getAnimationStateForPet({ zoneId: 'chin', isStroke: true, goodStrokeCount: 6, previousState: 'beingPetted' })
 * // → 'purringPeak'
 */
export function getAnimationStateForPet(input: AnimationInput): CatAnimationState {
  if (!input.zoneId) {
    return input.previousState === 'idle' ? 'idle' : 'noticing';
  }

  if (input.zoneId === 'eyes') {
    return 'annoyed';
  }

  if (!input.isStroke) {
    return input.previousState === 'idle' ? 'noticing' : input.previousState;
  }

  return input.goodStrokeCount >= PURRING_PEAK_STROKES ? 'purringPeak' : 'beingPetted';
}

/**
 * Animation state to apply when the user lifts their finger.
 *
 * @param previousState - State at the moment of release.
 * @returns `'annoyed'` if the cat was annoyed; otherwise `'postPet'`.
 */
export function getReleaseAnimationState(previousState: CatAnimationState): CatAnimationState {
  return previousState === 'annoyed' ? 'annoyed' : 'postPet';
}
