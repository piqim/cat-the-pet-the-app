/**
 * @file petController
 * @module engine/petController
 *
 * Converts raw screen touch coordinates into structured pet events: which zone
 * was hit, whether the movement counts as a stroke, and the sprite-local point.
 *
 * Edge cases:
 * - Touches outside sprite bounds return undefined (gesture ignored).
 * - First touch frame has no previous point → distance is 0 → not a stroke.
 * - Stroke threshold is TUNING.MIN_STROKE_PX in screen pixels (not sprite-local).
 * - Sprite-local coords use a fixed 32-unit grid scaled by bounds.size / 32.
 *
 * Usage:
 *   const event = createPetEvent(touch, prevTouch, spriteBounds);
 *   if (event?.isStroke && event.zone) { ... }
 */

import { TUNING } from '../data/tuning';
import { hitTestPetZone, PetZone, Point } from './hitTest';

/** Screen-space rectangle enclosing the rendered cat sprite. */
export type SpriteBounds = {
  x: number;
  y: number;
  size: number;
};

/** Structured result of processing one touch frame against the cat. */
export type PetEvent = {
  zone?: PetZone;
  localPoint: Point;
  isStroke: boolean;
};

/**
 * Creates a pet event from a screen touch, or undefined if outside the sprite.
 *
 * @param screenPoint - Current finger position in screen coordinates.
 * @param previousScreenPoint - Previous frame position (undefined on first touch).
 * @param bounds - Cat sprite bounding box on screen.
 * @returns Pet event with zone hit-test and stroke flag, or undefined if out of bounds.
 */
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

/**
 * Converts a screen point to sprite-local coordinates on the 32×32 grid.
 *
 * @param point - Screen coordinates.
 * @param bounds - Sprite bounding box (position + rendered size).
 * @returns Point on the 32-unit sprite grid used by hitTest.
 *
 * @example
 * // A touch at the center of a 340px sprite → approximately { x: 16, y: 16 }.
 * toSpriteLocalPoint({ x: bounds.x + 170, y: bounds.y + 170 }, bounds)
 */
export function toSpriteLocalPoint(point: Point, bounds: SpriteBounds): Point {
  const scale = bounds.size / 32;

  return {
    x: (point.x - bounds.x) / scale,
    y: (point.y - bounds.y) / scale,
  };
}

/**
 * Tests whether a screen point lies inside the sprite bounding box (inclusive).
 *
 * @param point - Screen coordinates.
 * @param bounds - Sprite bounding box.
 * @returns True if inside the square bounds.
 */
function isPointInBounds(point: Point, bounds: SpriteBounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.size &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.size
  );
}

/**
 * Euclidean distance between two screen points.
 *
 * @param first - First point.
 * @param second - Second point.
 * @returns Distance in screen pixels.
 */
function getDistance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}
