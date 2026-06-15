import { TUNING } from '../data/tuning';
import { hitTestPetZone, PetZone, Point } from './hitTest';

export type SpriteBounds = {
  x: number;
  y: number;
  size: number;
};

export type PetEvent = {
  zone?: PetZone;
  localPoint: Point;
  isStroke: boolean;
};

export function createPetEvent(
  screenPoint: Point,
  previousScreenPoint: Point | undefined,
  bounds: SpriteBounds,
): PetEvent | undefined {
  if (!isPointInBounds(screenPoint, bounds)) {
    return undefined;
  }

  const localPoint = toSpriteLocalPoint(screenPoint, bounds);
  const distance = previousScreenPoint ? getDistance(screenPoint, previousScreenPoint) : 0;

  return {
    zone: hitTestPetZone(localPoint),
    localPoint,
    isStroke: distance >= TUNING.MIN_STROKE_PX,
  };
}

export function toSpriteLocalPoint(point: Point, bounds: SpriteBounds): Point {
  const scale = bounds.size / 32;

  return {
    x: (point.x - bounds.x) / scale,
    y: (point.y - bounds.y) / scale,
  };
}

function isPointInBounds(point: Point, bounds: SpriteBounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.size &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.size
  );
}

function getDistance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}
