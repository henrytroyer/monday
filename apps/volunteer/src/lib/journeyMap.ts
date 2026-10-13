import type { JourneyRegion } from './journey';

/** Native pixel size of `/brand/world-map.png`. */
export const WORLD_WIDTH = 508;
export const WORLD_HEIGHT = 292;
export const WORLD_VIEWBOX = `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`;

type Point = { x: number; y: number };

/** Pins fitted to the stock world-map artwork, not a raw lon/lat projection. */
export const JOURNEY_START: Point = { x: 132, y: 118 };

export const JOURNEY_ENDS: Record<JourneyRegion, Point> = {
  greece: { x: 342, y: 134 },
  germany: { x: 318, y: 104 },
  europe: { x: 324, y: 114 },
};

/** Cubic handles that lift the route over the North Atlantic. */
export const JOURNEY_CONTROL_A: Point = { x: 188, y: 86 };
export const JOURNEY_CONTROL_B: Point = { x: 252, y: 70 };

export function journeyEndpoint(region: JourneyRegion): Point {
  return JOURNEY_ENDS[region];
}

export function journeyStartPoint(): Point {
  return JOURNEY_START;
}

export function journeyFlightPathD(region: JourneyRegion): string {
  const start = journeyStartPoint();
  const c1 = JOURNEY_CONTROL_A;
  const c2 = JOURNEY_CONTROL_B;
  const end = journeyEndpoint(region);
  return `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
}

export function journeyFlightPoint(
  progress: number,
  region: JourneyRegion,
): { x: number; y: number; angle: number } {
  const t = Math.min(1, Math.max(0, progress));
  const p0 = journeyStartPoint();
  const p1 = JOURNEY_CONTROL_A;
  const p2 = JOURNEY_CONTROL_B;
  const p3 = journeyEndpoint(region);
  const mt = 1 - t;
  const x =
    mt * mt * mt * p0.x +
    3 * mt * mt * t * p1.x +
    3 * mt * t * t * p2.x +
    t * t * t * p3.x;
  const y =
    mt * mt * mt * p0.y +
    3 * mt * mt * t * p1.y +
    3 * mt * t * t * p2.y +
    t * t * t * p3.y;
  const dx =
    3 * mt * mt * (p1.x - p0.x) +
    6 * mt * t * (p2.x - p1.x) +
    3 * t * t * (p3.x - p2.x);
  const dy =
    3 * mt * mt * (p1.y - p0.y) +
    6 * mt * t * (p2.y - p1.y) +
    3 * t * t * (p3.y - p2.y);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}
