export type ArrayVector2 = [number, number];
export type StringVector2 = `${number},${number}`;

export interface Point2 {
  x: number;
  y: number;
}

export class Vector2 {
  constructor(public x: number, public y: number) {}

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  addValue(x: number, y: number) {
    this.x += x;
    this.y += y;
  }

  subtract(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  perp(): Vector2 {
    return new Vector2(-this.y, this.x);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector2 {
    const len = this.length();

    if (len === 0) {
      // If the length is zero, return a new zero vector to avoid division by zero
      return new Vector2(0, 0);
    }

    return new Vector2(this.x / len, this.y / len);
  }

  clone() {
    return new Vector2(this.x, this.y);
  }

  scale(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  divide(scalar: number): Vector2 {
    if (scalar === 0) {
      throw new Error("Cannot divide by zero");
    }
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  isZero() {
    return this.x === 0 && this.y === 0;
  }

  squaredDistanceTo(vec: Point2): number {
    const dx = vec.x - this.x;
    const dy = vec.y - this.y;
    return dx * dx + dy * dy;
  }

  distanceTo(vec: Point2) {
    return Math.sqrt(this.squaredDistanceTo(vec));
  }

  round(decimals: number = 0) {
    const factor = Math.pow(10, decimals);
    return new Vector2(
      Math.round(this.x * factor) / factor,
      Math.round(this.y * factor) / factor
    );
  }

  toArray(): ArrayVector2 {
    return [this.x, this.y];
  }

  toString(): StringVector2 {
    return `${this.x},${this.y}`;
  }

  toPoint(): Point2 {
    return { x: this.x, y: this.y };
  }

  floor(): Vector2 {
    return new Vector2(Math.floor(this.x), Math.floor(this.y));
  }

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

  interpolate(goal: Vector2, t: number) {
    return new Vector2(
      this.x + (goal.x - this.x) * t,
      this.y + (goal.y - this.y) * t
    );
  }

  rotate(angleInRadians: number) {
    const cos = Math.cos(angleInRadians);
    const sin = Math.sin(angleInRadians);

    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  static cross(v1: Vector2, v2: Vector2): number {
    return v1.x * v2.y - v1.y * v2.x;
  }

  static fromPoint({ x, y }: Point2) {
    return new Vector2(x, y);
  }

  static fromArray([x, y]: ArrayVector2) {
    return new Vector2(x, y);
  }

  static equal(v1: Point2, v2: Point2) {
    return v1.x === v2.x && v1.y === v2.y;
  }

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

  getRotationTo(target: Vector2): number {
    // Calculate the difference vector (target - this)
    const diff = target.subtract(this);

    // Return the angle of the difference vector relative to the positive x-axis
    return diff.angle();
  }
}
