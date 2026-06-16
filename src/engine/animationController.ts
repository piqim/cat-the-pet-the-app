import { PetZoneId } from './hitTest';

export type CatAnimationState =
  | 'idle'
  | 'noticing'
  | 'beingPetted'
  | 'purringPeak'
  | 'postPet'
  | 'annoyed'
  | 'streakMilestone';

export type AnimationInput = {
  zoneId?: PetZoneId;
  isStroke: boolean;
  goodStrokeCount: number;
  previousState: CatAnimationState;
};

const PURRING_PEAK_STROKES = 5;

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

export function getReleaseAnimationState(previousState: CatAnimationState): CatAnimationState {
  return previousState === 'annoyed' ? 'annoyed' : 'postPet';
}
