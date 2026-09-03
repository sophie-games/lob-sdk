import { BoundingBox, ShapeType } from "../types";
import { Point2, Vector2 } from "@lob-sdk/vector";

export class Circle {
  readonly shapeType = ShapeType.Circle;
  public position: Vector2;
  public radius: number;

  constructor(centerX: number, centerY: number, radius: number) {
    if (radius <= 0) {
      throw new Error("Radius must be greater than 0");
    }
    this.position = new Vector2(centerX, centerY);
    this.radius = radius;
  }

  private _boundingBox: BoundingBox | null = null;
  get boundingBox() {
    if (!this._boundingBox) {
      this._boundingBox = this.calculateBoundingBox();
    }

    return this._boundingBox;
  }

  private calculateBoundingBox(): BoundingBox {
    return {
      minX: this.position.x - this.radius,
      maxX: this.position.x + this.radius,
      minY: this.position.y - this.radius,
      maxY: this.position.y + this.radius,
    };
  }

  /**
   * Checks if this circle collides with another and returns the squared distance between their centers if they collide
   * @param other The other circle to check collision with
   * @returns The squared distance between the centers if the circles collide, or null if they don't
   */
  getCollisionSquaredDistance(other: Circle): number | null {
    const distanceSquared = this.position.squaredDistanceTo(other.position);
    const radiusSum = this.radius + other.radius;
    if (distanceSquared < radiusSum * radiusSum) {
      // Collision occurs, return the squared distance
      return distanceSquared;
    }
    // No collision
    return null;
  }

  /**
   * Check if a point is inside the circle
   */
  isPointInside(point: Point2): boolean {
    // Calculate distance squared (avoid square root for performance)
    const dx = point.x - this.position.x;
    const dy = point.y - this.position.y;
    const distanceSquared = dx * dx + dy * dy;

    return distanceSquared <= this.radius * this.radius;
  }

  /**
   * Check if circle intersects with a line segment, optionally considering line width
   * @param lineStart Starting point of the line segment
   * @param lineEnd Ending point of the line segment
   * @param lineWidth Optional width of the line (default: 0, infinitely thin)
   * @returns true if the circle intersects with the line segment, false otherwise
   */
  intersectsWithLine(
    lineStart: Point2,
    lineEnd: Point2,
    lineWidth: number = 0,
  ): boolean {
    // Quick check using bounding box, adjusted for line width
    const halfWidth = lineWidth / 2;

    const lineBoxMinX = Math.min(lineStart.x, lineEnd.x) - halfWidth;
    const lineBoxMaxX = Math.max(lineStart.x, lineEnd.x) + halfWidth;
    const lineBoxMinY = Math.min(lineStart.y, lineEnd.y) - halfWidth;
    const lineBoxMaxY = Math.max(lineStart.y, lineEnd.y) + halfWidth;

    if (
      this.boundingBox.minX > lineBoxMaxX ||
      this.boundingBox.maxX < lineBoxMinX ||
      this.boundingBox.minY > lineBoxMaxY ||
      this.boundingBox.maxY < lineBoxMinY
    ) {
      return false;
    }

    // Check if either endpoint is inside the circle
    if (this.isPointInside(lineStart) || this.isPointInside(lineEnd)) {
      return true;
    }

    // Calculate closest point on line segment to circle center
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y; // Fixed: Correct dy calculation
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      return this.isPointInside(lineStart); // Line segment is a point
    }

    // Calculate projection of circle center onto line
    let t =
      ((this.position.x - lineStart.x) * dx +
        (this.position.y - lineStart.y) * dy) /
      lengthSquared;

    // If the projection is outside 0-1, we will check if it can overlap without the added width.
    // This cuts off the rounded caps on projectile width.
    if (t < 0) {
      // Past the start: Check distance to the flat plane at lineStart
      const distBefore = -t * Math.sqrt(lengthSquared);
      if (distBefore > this.radius) return false;
    } else if (t > 1) {
      // Past the end: Check distance to the flat plane at lineEnd
      const distPast = (t - 1) * Math.sqrt(lengthSquared);
      if (distPast > this.radius) return false;
    }

    // Now we can clamp T to do the width check safely
    t = Math.max(0, Math.min(1, t));

    const closestPoint: Point2 = {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy,
    };

    // Check distance to closest point, accounting for line width
    const dxToClosest = this.position.x - closestPoint.x;
    const dyToClosest = this.position.y - closestPoint.y;
    const distanceSquared =
      dxToClosest * dxToClosest + dyToClosest * dyToClosest;
    const effectiveRadius = this.radius + halfWidth;

    return distanceSquared <= effectiveRadius * effectiveRadius;
  }

  getRadius(): number {
    return this.radius;
  }

  getBoundingBox(): BoundingBox {
    return { ...this.boundingBox };
  }

  /**
   * Check if this circle intersects with any circle in the provided array
   * @param circles Array of circles to check intersection with
   * @returns true if this circle intersects with any circle in the array, false otherwise
   */
  intersectsWithCircles(circles: Circle[]): boolean {
    // Quick check using bounding boxes
    for (const other of circles) {
      if (
        this.boundingBox.minX <= other.boundingBox.maxX &&
        this.boundingBox.maxX >= other.boundingBox.minX &&
        this.boundingBox.minY <= other.boundingBox.maxY &&
        this.boundingBox.maxY >= other.boundingBox.minY
      ) {
        // If bounding boxes intersect, check for actual circle intersection
        if (this.getCollisionSquaredDistance(other) !== null) {
          return true;
        }
      }
    }
    return false;
  }
}
