import { Zone } from "@lob-sdk/types";
import { Point2, Vector2 } from "@lob-sdk/vector";

export function getSquaredDistance(point1: Point2, point2: Point2): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return dx * dx + dy * dy;
}

export const median = (values: number[]): number => {
  if (values.length === 0) return 0;

  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);

  if (values.length % 2 !== 0) {
    return values[mid];
  }

  return (values[mid - 1] + values[mid]) / 2;
};

export const medianPoint = (points: Point2[]): Point2 => {
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);

  return {
    x: median(xValues),
    y: median(yValues),
  };
};

export function divideArrayInHalf<T>(array: T[]): [T[], T[]] {
  const mid = Math.ceil(array.length / 2); // Use Math.ceil to handle odd-length arrays
  const firstHalf = array.slice(0, mid);
  const secondHalf = array.slice(mid);

  return [firstHalf, secondHalf];
}

export const getClosestPointInsideZone = (
  zone: Zone,
  point: Point2,
  buffer: number = 0
) => {
  const clampedX = Math.max(
    zone.x - buffer,
    Math.min(point.x, zone.x + zone.width + buffer)
  );
  const clampedY = Math.max(
    zone.y - buffer,
    Math.min(point.y, zone.y + zone.height + buffer)
  );
  return new Vector2(clampedX, clampedY);
};
