import { Vector2 } from "./vector2";

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export class Vector3 {
  constructor(public x: number, public y: number, public z: number) {}

  static fromVector2(v: Vector2, z: number): Vector3 {
    return new Vector3(v.x, v.y, z);
  }

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  multiply(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  distanceTo(v: Vector3): number {
    return Math.sqrt(
      (this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2
    );
  }

  toVector2(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  scale(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  normalize(): Vector3 {
    const length = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
    return length > 0 ? this.scale(1 / length) : this;
  }

  round(decimals: number = 0): Vector3 {
    const factor = Math.pow(10, decimals);
    return new Vector3(
      Math.round(this.x * factor) / factor,
      Math.round(this.y * factor) / factor,
      Math.round(this.z * factor) / factor
    );
  }

  length(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
  }

  scaleXY(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z);
  }

  floorXY(): Vector3 {
    return new Vector3(Math.floor(this.x), Math.floor(this.y), this.z);
  }

  equals(vector: Vector3) {
    return this.x === vector.x && this.y === vector.y && this.z === vector.z;
  }
}
