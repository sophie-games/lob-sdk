import { Vector2 } from "@lob-sdk/vector";
import { ShapeType } from "../types";

export class Rectangle {
  readonly shapeType = ShapeType.Rectangle;
  vertices: Vector2[] = [];

  constructor(
    public center: Vector2,
    public width: number,
    public height: number,
    public rotation: number // In radians
  ) {
    this.updateVertices();
  }

  updateVertices(): void {
    const cosA = Math.cos(this.rotation);
    const sinA = Math.sin(this.rotation);
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;

    this.vertices = [
      new Vector2(
        this.center.x + cosA * halfWidth - sinA * halfHeight,
        this.center.y + sinA * halfWidth + cosA * halfHeight
      ),
      new Vector2(
        this.center.x - cosA * halfWidth - sinA * halfHeight,
        this.center.y - sinA * halfWidth + cosA * halfHeight
      ),
      new Vector2(
        this.center.x - cosA * halfWidth + sinA * halfHeight,
        this.center.y - sinA * halfWidth - cosA * halfHeight
      ),
      new Vector2(
        this.center.x + cosA * halfWidth + sinA * halfHeight,
        this.center.y + sinA * halfWidth - cosA * halfHeight
      ),
    ];
  }

  getEdges(): Vector2[] {
    const edges: Vector2[] = [];
    for (let i = 0; i < this.vertices.length; i++) {
      edges.push(this.vertices[(i + 1) % 4].subtract(this.vertices[i]));
    }
    return edges;
  }

  pointTouches(point: Vector2): boolean {
    // Step 1: Translate the point to the rectangle's center
    const translatedPoint = new Vector2(
      point.x - this.center.x,
      point.y - this.center.y
    );

    // Step 2: Rotate the point by the negative rectangle's rotation
    const cosA = Math.cos(-this.rotation);
    const sinA = Math.sin(-this.rotation);
    const rotatedX = translatedPoint.x * cosA - translatedPoint.y * sinA;
    const rotatedY = translatedPoint.x * sinA + translatedPoint.y * cosA;

    // Step 3: Check if the rotated point is within the bounds of the unrotated rectangle
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;

    return (
      rotatedX >= -halfWidth &&
      rotatedX <= halfWidth &&
      rotatedY >= -halfHeight &&
      rotatedY <= halfHeight
    );
  }
}
