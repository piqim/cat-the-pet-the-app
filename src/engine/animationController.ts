import { PetZoneId } from './hitTest';

export type CatAnimationState =
  | 'idle'
  | 'noticing'
  | 'beingPetted'
  | 'purringPeak'
  | 'postPet'
  | 'annoyed'
  | 'streakMilestone';

export function getAnimationStateForZone(zoneId: PetZoneId | undefined): CatAnimationState {
  if (!zoneId) {
    return 'idle';
  }

  return zoneId === 'eyes' ? 'annoyed' : 'beingPetted';
}
