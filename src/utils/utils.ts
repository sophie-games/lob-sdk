import { DEG_TO_RAD, TWO_PI } from "@lob-sdk/constants";
import { Zone } from "@lob-sdk/types";
import { Point2, Vector2 } from "@lob-sdk/vector";

/**
 * Calculates the squared distance between two points.
 * This is faster than calculating the actual distance as it avoids the square root operation.
 * @param point1 - The first point.
 * @param point2 - The second point.
 * @returns The squared distance between the two points.
 */
export function getSquaredDistance(point1: Point2, point2: Point2): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return dx * dx + dy * dy;
}

/**
 * Calculates the median value from an array of numbers.
 * @param values - An array of numbers.
 * @returns The median value, or 0 if the array is empty.
 */
export const median = (values: number[]): number => {
  if (values.length === 0) return 0;

  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);

  if (values.length % 2 !== 0) {
    return values[mid];
  }

  return (values[mid - 1] + values[mid]) / 2;
};

/**
 * Calculates the median point from an array of points.
 * @param points - An array of points.
 * @returns A point with the median x and y coordinates.
 */
export const medianPoint = (points: Point2[]): Point2 => {
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);

  return {
    x: median(xValues),
    y: median(yValues),
  };
};

/**
 * Divides an array into two halves.
 * @param array - The array to divide.
 * @returns A tuple containing the first half and second half of the array.
 * @template T - The type of elements in the array.
 */
export function divideArrayInHalf<T>(array: T[]): [T[], T[]] {
  const mid = Math.ceil(array.length / 2); // Use Math.ceil to handle odd-length arrays
  const firstHalf = array.slice(0, mid);
  const secondHalf = array.slice(mid);

  return [firstHalf, secondHalf];
}

/**
 * Gets the closest point inside a zone to a given point, clamping the point to the zone boundaries.
 * @param zone - The zone to clamp the point to.
 * @param point - The point to clamp.
 * @param buffer - An optional buffer value to expand the zone boundaries (default: 0).
 * @returns A Vector2 representing the closest point inside the zone.
 */
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

/**
 * Converts radians to degrees and ensures the result is within the range [0, 360).
 */
export function radiansToDegreesNormalized(radians: number): number {
  let degrees = radians * (180 / Math.PI);
  degrees = degrees % 360; // Ensure the result is within 0-360
  if (degrees < 0) {
    degrees += 360; // Adjust if the result is negative
  }
  return Math.round(degrees);
}

/**
 * Converts degrees to radians.
 * @param degrees - The angle in degrees.
 * @returns The angle in radians.
 */
export function degreesToRadians(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

/**
 * Converts degrees to radians with full normalization.
 * Handles values outside [0, 360) range correctly.
 * Use this when the input might be negative or > 360.
 */
export function degreesToRadiansNormalized(degrees: number): number {
  let radians = degrees * DEG_TO_RAD;
  radians = radians % TWO_PI; // Ensure the result is within 0-2PI
  if (radians < 0) {
    radians += TWO_PI; // Adjust if the result is negative
  }
  return radians;
}
