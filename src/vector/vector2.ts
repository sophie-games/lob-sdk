/**
 * A tuple representing a 2D vector as [x, y].
 */
export type ArrayVector2 = [number, number];

/**
 * A string representation of a 2D vector in the format "x,y".
 */
export type StringVector2 = `${number},${number}`;

/**
 * A 2D point with x and y coordinates.
 */
export interface Point2 {
  /** The x coordinate. */
  x: number;
  /** The y coordinate. */
  y: number;
}

/**
 * A 2D vector class providing mathematical operations for 2D vectors.
 */
export class Vector2 {
  /**
   * Creates a new Vector2 instance.
   * @param x - The x component of the vector.
   * @param y - The y component of the vector.
   */
  constructor(public x: number, public y: number) {}

  /**
   * Adds another vector to this vector and returns a new vector.
   * @param v - The vector to add.
   * @returns A new vector representing the sum.
   */
  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  /**
   * Adds scalar values directly to this vector's components (mutates this vector).
   * @param x - The x value to add.
   * @param y - The y value to add.
   */
  addValue(x: number, y: number) {
    this.x += x;
    this.y += y;
  }

  /**
   * Subtracts another vector from this vector and returns a new vector.
   * @param v - The vector to subtract.
   * @returns A new vector representing the difference.
   */
  subtract(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  /**
   * Calculates the dot product of this vector with another vector.
   * @param v - The vector to calculate the dot product with.
   * @returns The dot product value.
   */
  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Returns a perpendicular vector (rotated 90 degrees counterclockwise).
   * @returns A new perpendicular vector.
   */
  perp(): Vector2 {
    return new Vector2(-this.y, this.x);
  }

  /**
   * Calculates the length (magnitude) of this vector.
   * @returns The length of the vector.
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Normalizes this vector to unit length and returns a new vector.
   * If the vector is zero, returns a zero vector.
   * @returns A new normalized vector.
   */
  normalize(): Vector2 {
    const len = this.length();

    if (len === 0) {
      // If the length is zero, return a new zero vector to avoid division by zero
      return new Vector2(0, 0);
    }

    return new Vector2(this.x / len, this.y / len);
  }

  /**
   * Creates a copy of this vector.
   * @returns A new vector with the same x and y values.
   */
  clone() {
    return new Vector2(this.x, this.y);
  }

  /**
   * Multiplies this vector by a scalar and returns a new vector.
   * @param scalar - The scalar value to multiply by.
   * @returns A new scaled vector.
   */
  scale(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  /**
   * Divides this vector by a scalar and returns a new vector.
   * @param scalar - The scalar value to divide by.
   * @returns A new divided vector.
   * @throws Error if scalar is zero.
   */
  divide(scalar: number): Vector2 {
    if (scalar === 0) {
      throw new Error("Cannot divide by zero");
    }
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  /**
   * Checks if this vector is the zero vector (both components are zero).
   * @returns True if the vector is zero, false otherwise.
   */
  isZero() {
    return this.x === 0 && this.y === 0;
  }

  /**
   * Calculates the squared distance from this vector to a point.
   * This is faster than distanceTo as it avoids the square root calculation.
   * @param vec - The point to calculate the distance to.
   * @returns The squared distance.
   */
  squaredDistanceTo(vec: Point2): number {
    const dx = vec.x - this.x;
    const dy = vec.y - this.y;
    return dx * dx + dy * dy;
  }

  /**
   * Calculates the distance from this vector to a point.
   * @param vec - The point to calculate the distance to.
   * @returns The distance.
   */
  distanceTo(vec: Point2) {
    return Math.sqrt(this.squaredDistanceTo(vec));
  }

  /**
   * Rounds the components of this vector to a specified number of decimal places.
   * @param decimals - The number of decimal places to round to (default: 0).
   * @returns A new vector with rounded components.
   */
  round(decimals: number = 0) {
    const factor = Math.pow(10, decimals);
    return new Vector2(
      Math.round(this.x * factor) / factor,
      Math.round(this.y * factor) / factor
    );
  }

  /**
   * Converts this vector to an array representation [x, y].
   * @returns An array containing the x and y components.
   */
  toArray(): ArrayVector2 {
    return [this.x, this.y];
  }

  /**
   * Converts this vector to a string representation "x,y".
   * @returns A string representation of the vector.
   */
  toString(): StringVector2 {
    return `${this.x},${this.y}`;
  }

  /**
   * Converts this vector to a Point2 object.
   * @returns A Point2 object with the same x and y values.
   */
  toPoint(): Point2 {
    return { x: this.x, y: this.y };
  }

  /**
   * Floors the components of this vector and returns a new vector.
   * @returns A new vector with floored components.
   */
  floor(): Vector2 {
    return new Vector2(Math.floor(this.x), Math.floor(this.y));
  }

  /**
   * Finds the closest vector from an iterable collection to this vector.
   * @param vectors - An iterable collection of vectors to search.
   * @returns The closest vector, or null if the collection is empty.
   */
  getClosestVector(vectors: Iterable<Vector2>) {
    let closestPosition: Vector2 | null = null;
    let closestDistance = Infinity;

    for (const vector of vectors) {
      const distance = vector.squaredDistanceTo(this);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPosition = vector;
      }
    }

    return closestPosition;
  }

  /**
   * Interpolates between this vector and a goal vector.
   * @param goal - The target vector to interpolate towards.
   * @param t - The interpolation factor (0 = this vector, 1 = goal vector).
   * @returns A new interpolated vector.
   */
  interpolate(goal: Vector2, t: number) {
    return new Vector2(
      this.x + (goal.x - this.x) * t,
      this.y + (goal.y - this.y) * t
    );
  }

  /**
   * Rotates this vector by a given angle in radians.
   * @param angleInRadians - The angle to rotate by (in radians).
   * @returns A new rotated vector.
   */
  rotate(angleInRadians: number) {
    const cos = Math.cos(angleInRadians);
    const sin = Math.sin(angleInRadians);

    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  /**
   * Calculates the cross product of two 2D vectors.
   * The result represents the signed area of the parallelogram formed by the vectors.
   * @param v1 - The first vector.
   * @param v2 - The second vector.
   * @returns The cross product value.
   */
  static cross(v1: Vector2, v2: Vector2): number {
    return v1.x * v2.y - v1.y * v2.x;
  }

  /**
   * Creates a Vector2 from a Point2 object.
   * @param point - The point to convert.
   * @returns A new Vector2 with the point's coordinates.
   */
  static fromPoint({ x, y }: Point2) {
    return new Vector2(x, y);
  }

  /**
   * Creates a Vector2 from an array [x, y].
   * @param array - The array containing x and y values.
   * @returns A new Vector2 with the array's values.
   */
  static fromArray([x, y]: ArrayVector2) {
    return new Vector2(x, y);
  }

  /**
   * Checks if two points are equal.
   * @param v1 - The first point.
   * @param v2 - The second point.
   * @returns True if the points are equal, false otherwise.
   */
  static equal(v1: Point2, v2: Point2) {
    return v1.x === v2.x && v1.y === v2.y;
  }

  /**
   * Calculates the center (centroid) of an array of vectors.
   * @param vectors - An array of vectors.
   * @returns The center vector.
   * @throws Error if the array is empty.
   */
  static center(vectors: Vector2[]): Vector2 {
    if (vectors.length === 0) {
      throw new Error("No vectors provided.");
    }

    const sum = vectors.reduce((acc, vec) => acc.add(vec), new Vector2(0, 0));

    const count = vectors.length;
    return new Vector2(sum.x / count, sum.y / count);
  }

  /**
   * Creates a unit vector from a given radian angle.
   */
  static fromAngle(angle: number): Vector2 {
    return new Vector2(Math.cos(angle), Math.sin(angle));
  }

  /**
   * Returns the angle of the vector in radians relative to the positive x-axis.
   * The result is between -π and π.
   */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Calculates the rotation angle from this vector to a target vector.
   * @param target - The target vector.
   * @returns The angle in radians from this vector to the target vector.
   */
  getRotationTo(target: Vector2): number {
    // Calculate the difference vector (target - this)
    const diff = target.subtract(this);

    // Return the angle of the difference vector relative to the positive x-axis
    return diff.angle();
  }
}
