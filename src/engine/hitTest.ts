export type Point = {
  x: number;
  y: number;
};

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

export type PetZone = {
  id: PetZoneId;
  label: string;
  polygon: Point[];
  isNegative?: boolean;
};

export const PET_ZONES: PetZone[] = [
  {
    id: 'eyes',
    label: 'Eyes',
    isNegative: true,
    polygon: [
      { x: 10, y: 10 },
      { x: 22, y: 10 },
      { x: 22, y: 16 },
      { x: 10, y: 16 },
    ],
  },
  {
    id: 'leftEar',
    label: 'L.Ear',
    polygon: [
      { x: 5, y: 1 },
      { x: 12, y: 1 },
      { x: 12, y: 9 },
      { x: 5, y: 9 },
    ],
  },
  {
    id: 'forehead',
    label: 'Forehead',
    polygon: [
      { x: 12, y: 2 },
      { x: 20, y: 2 },
      { x: 20, y: 11 },
      { x: 12, y: 11 },
    ],
  },
  {
    id: 'rightEar',
    label: 'R.Ear',
    polygon: [
      { x: 20, y: 1 },
      { x: 27, y: 1 },
      { x: 27, y: 9 },
      { x: 20, y: 9 },
    ],
  },
  {
    id: 'chin',
    label: 'Chin',
    polygon: [
      { x: 10, y: 16 },
      { x: 22, y: 16 },
      { x: 22, y: 22 },
      { x: 10, y: 22 },
    ],
  },
  {
    id: 'leftPaw',
    label: 'L.Paw',
    polygon: [
      { x: 4, y: 22 },
      { x: 10, y: 22 },
      { x: 10, y: 31 },
      { x: 4, y: 31 },
    ],
  },
  {
    id: 'leftChest',
    label: 'L.Chest',
    polygon: [
      { x: 10, y: 22 },
      { x: 16, y: 22 },
      { x: 16, y: 31 },
      { x: 10, y: 31 },
    ],
  },
  {
    id: 'rightChest',
    label: 'R.Chest',
    polygon: [
      { x: 16, y: 22 },
      { x: 22, y: 22 },
      { x: 22, y: 31 },
      { x: 16, y: 31 },
    ],
  },
  {
    id: 'rightPaw',
    label: 'R.Paw',
    polygon: [
      { x: 22, y: 22 },
      { x: 28, y: 22 },
      { x: 28, y: 31 },
      { x: 22, y: 31 },
    ],
  },
];

export function hitTestPetZone(point: Point): PetZone | undefined {
  return PET_ZONES.find((zone) => isPointInPolygon(point, zone.polygon));
}

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
