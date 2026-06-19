/**
 * @file hitTest
 * @module engine/hitTest
 *
 * Defines pet-zone polygons on a 32×32 sprite grid and hit-tests touch points
 * against them. Coordinates are scaled to the rendered cat size at runtime
 * (see petController.toSpriteLocalPoint and PetZonesOverlay).
 *
 * Edge cases:
 * - Zones are tested in array order — first match wins on overlap.
 * - `eyes` is a negative zone (`isNegative: true`) triggering annoyed reaction.
 * - Polygons can be non-rectangular; hit test uses ray-casting (even-odd rule).
 * - Points outside all polygons return undefined (no zone).
 * - Coordinate origin is top-left of the sprite; y increases downward.
 *
 * Usage:
 *   const zone = hitTestPetZone({ x: 15, y: 18 }); // local sprite coords
 *   // Adjust polygons in PET_ZONES, save, and use __DEV__ overlay to verify.
 */

/** A 2D point in sprite-local or screen space. */
export type Point = {
  x: number;
  y: number;
};

/** Stable identifier for each pettable (or negative) body region. */
export type PetZoneId =
  | 'leftPaw'
  | 'leftChest'
  | 'rightChest'
  | 'rightPaw'
  | 'chin'
  | 'forehead'
  | 'leftEar'
  | 'rightEar'
  | 'eyes';

/**
 * A tappable region on the cat sprite.
 *
 * @property polygon - Vertices on the 32×32 grid (clockwise or counter-clockwise).
 * @property isNegative - When true, petting triggers annoyed state instead of reward.
 */
export type PetZone = {
  id: PetZoneId;
  label: string;
  polygon: Point[];
  isNegative?: boolean;
};

/**
 * All pet zones in hit-test priority order.
 * Edit polygon coordinates here to tune zone positions; the __DEV__ overlay
 * in PetScreen reflects changes on save via Fast Refresh.
 */
export const PET_ZONES: PetZone[] = [
  {
    id: 'eyes',
    label: 'Eyes',
    isNegative: true,
    polygon: [
      { x: 10, y: 20 },
      { x: 22, y: 15 },
      { x: 22, y: 20 },
      { x: 10, y: 15 },
    ],
  },
  {
    id: 'leftEar',
    label: 'L.Ear',
    polygon: [
      { x: 5, y: 15 },
      { x: 12, y: 6 },
      { x: 12, y: 9 },
      { x: 5, y: 9 },
    ],
  },
  {
    id: 'forehead',
    label: 'Forehead',
    polygon: [
      { x: 12, y: 15 },
      { x: 20, y: 10 },
      { x: 20, y: 11 },
      { x: 12, y: 11 },
    ],
  },
  {
    id: 'rightEar',
    label: 'R.Ear',
    polygon: [
      { x: 20, y: 15 },
      { x: 27, y: 6 },
      { x: 27, y: 9 },
      { x: 20, y: 9 },
    ],
  },
  {
    id: 'chin',
    label: 'Chin',
    polygon: [
      { x: 10, y: 20 },
      { x: 22, y: 20 },
      { x: 22, y: 25 },
      { x: 10, y: 25 },
    ],
  },
  {
    id: 'leftPaw',
    label: 'L.Paw',
    polygon: [
      { x: 16, y: 27 },
      { x: 16, y: 27 },
      { x: 10, y: 31 },
      { x: 10, y: 31 },
    ],
  },
  {
    id: 'leftChest',
    label: 'L.Chest',
    polygon: [
      { x: 10, y: 22 },
      { x: 16, y: 22 },
      { x: 5, y: 27 },
      { x: 5, y: 27 },
    ],
  },
  {
    id: 'rightChest',
    label: 'R.Chest',
    polygon: [
      { x: 16, y: 22 },
      { x: 22, y: 22 },
      { x: 27, y: 27 },
      { x: 27, y: 27 },
    ],
  },
  {
    id: 'rightPaw',
    label: 'R.Paw',
    polygon: [
      { x: 16, y: 27 },
      { x: 16, y: 27 },
      { x: 22, y: 31 },
      { x: 22, y: 31 },
    ],
  },
];

/**
 * Returns the first pet zone containing the given sprite-local point.
 *
 * @param point - Coordinates on the 32×32 sprite grid.
 * @returns Matching zone, or undefined if the point misses all polygons.
 */
export function hitTestPetZone(point: Point): PetZone | undefined {
  return PET_ZONES.find((zone) => isPointInPolygon(point, zone.polygon));
}

/**
 * Ray-casting point-in-polygon test (even-odd winding rule).
 *
 * @param point - Point to test.
 * @param polygon - Closed polygon vertices (3+ points).
 * @returns True if the point lies inside the polygon.
 */
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let isInside = false;

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const currentPoint = polygon[current];
    const previousPoint = polygon[previous];
    const crossesY = currentPoint.y > point.y !== previousPoint.y > point.y;
    const intersectionX =
      ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
        (previousPoint.y - currentPoint.y) +
      currentPoint.x;

    if (crossesY && point.x < intersectionX) {
      isInside = !isInside;
    }
  }

  return isInside;
}
