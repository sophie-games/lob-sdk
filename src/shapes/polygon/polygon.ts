import { Circle } from "../circle";
import { BoundingBox, ShapeType } from "../types";
import { Point2 } from "@lob-sdk/vector";

export class Polygon {
  readonly shapeType = ShapeType.Polygon;
  private vertices: Point2[];
  private boundingBox: BoundingBox;

  constructor(points: Point2[]) {
    if (points.length < 3) {
      throw new Error("A polygon must have at least 3 vertices");
    }
    this.vertices = points;
    this.boundingBox = this.calculateBoundingBox();
  }

  getBoundingBox() {
    return this.boundingBox;
  }

  private calculateBoundingBox(): BoundingBox {
    let minX = Number.POSITIVE_INFINITY,
      maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY,
      maxY = Number.NEGATIVE_INFINITY;
    for (const p of this.vertices) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, maxX, minY, maxY };
  }

  // Check if a point is inside the polygon using ray casting algorithm
  isPointInside(point: Point2): boolean {
    // Quick check using bounding box
    if (
      point.x < this.boundingBox.minX ||
      point.x > this.boundingBox.maxX ||
      point.y < this.boundingBox.minY ||
      point.y > this.boundingBox.maxY
    ) {
      return false;
    }

    let inside = false;
    for (
      let i = 0, j = this.vertices.length - 1;
      i < this.vertices.length;
      j = i++
    ) {
      const vi = this.vertices[i];
      const vj = this.vertices[j];

      if (
        vi.y > point.y !== vj.y > point.y &&
        point.x < ((vj.x - vi.x) * (point.y - vi.y)) / (vj.y - vi.y) + vi.x
      ) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Check if this polygon collides with another polygon using Separating Axis Theorem (SAT)
  intersectsWith(other: Polygon): boolean {
    if (
      this.boundingBox.minX > other.boundingBox.maxX ||
      this.boundingBox.maxX < other.boundingBox.minX ||
      this.boundingBox.minY > other.boundingBox.maxY ||
      this.boundingBox.maxY < other.boundingBox.minY
    ) {
      return false;
    }

    const polygons = [this, other];
    for (const polygon of polygons) {
      for (let i = 0; i < polygon.vertices.length; i++) {
        const j = (i + 1) % polygon.vertices.length;
        const vx = polygon.vertices[j].x - polygon.vertices[i].x;
        const vy = polygon.vertices[j].y - polygon.vertices[i].y;
        const normal = { x: -vy, y: vx };
        const lenSq = normal.x * normal.x + normal.y * normal.y;
        if (lenSq < 1e-10) continue; // Skip degenerate edges

        const [min1, max1] = this.projectOntoAxis(normal, lenSq);
        const [min2, max2] = other.projectOntoAxis(normal, lenSq);
        if (max1 < min2 || max2 < min1) {
          return false;
        }
      }
    }
    return true;
  }

  private projectOntoAxis(axis: Point2, lenSq: number): [number, number] {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const vertex of this.vertices) {
      const projection = (vertex.x * axis.x + vertex.y * axis.y) / lenSq;
      min = Math.min(min, projection);
      max = Math.max(max, projection);
    }
    return [min, max];
  }

  // Static factory methods for creating specific polygon shapes
  static fromRotatedRectangle(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    angleInRadians: number
  ): Polygon {
    const cos = Math.cos(angleInRadians);
    const sin = Math.sin(angleInRadians);
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const points: Point2[] = [
      {
        x: centerX + cos * halfWidth - sin * halfHeight,
        y: centerY + sin * halfWidth + cos * halfHeight,
      },
      {
        x: centerX - cos * halfWidth - sin * halfHeight,
        y: centerY - sin * halfWidth + cos * halfHeight,
      },
      {
        x: centerX - cos * halfWidth + sin * halfHeight,
        y: centerY - sin * halfWidth - cos * halfHeight,
      },
      {
        x: centerX + cos * halfWidth + sin * halfHeight,
        y: centerY + sin * halfWidth - cos * halfHeight,
      },
    ];

    return new Polygon(points);
  }

  static fromRotatedTrapezoid(
    centerX: number,
    centerY: number,
    topWidth: number,
    bottomWidth: number,
    height: number,
    angleInRadians: number
  ): Polygon {
    const cos = Math.cos(angleInRadians);
    const sin = Math.sin(angleInRadians);
    const halfHeight = height / 2;
    const halfTopWidth = topWidth / 2;
    const halfBottomWidth = bottomWidth / 2;

    const points: Point2[] = [
      {
        x: centerX + cos * halfTopWidth - sin * halfHeight,
        y: centerY + sin * halfTopWidth + cos * halfHeight,
      },
      {
        x: centerX - cos * halfTopWidth - sin * halfHeight,
        y: centerY - sin * halfTopWidth + cos * halfHeight,
      },
      {
        x: centerX - cos * halfBottomWidth + sin * halfHeight,
        y: centerY - sin * halfBottomWidth - cos * halfHeight,
      },
      {
        x: centerX + cos * halfBottomWidth + sin * halfHeight,
        y: centerY + sin * halfBottomWidth - cos * halfHeight,
      },
    ];

    return new Polygon(points);
  }

  // Getter for vertices (returns a copy to prevent external modification)
  getVertices(): Point2[] {
    return [...this.vertices];
  }

  getVerticesArr(): number[] {
    return this.vertices.reduce<number[]>((acc, curr) => {
      acc.push(curr.x, curr.y);
      return acc;
    }, []);
  }

  intersectsWithLine(lineStart: Point2, lineEnd: Point2): boolean {
    // Quick check using bounding box
    const lineBox = {
      minX: Math.min(lineStart.x, lineEnd.x),
      maxX: Math.max(lineStart.x, lineEnd.x),
      minY: Math.min(lineStart.y, lineEnd.y),
      maxY: Math.max(lineStart.y, lineEnd.y),
    };

    if (
      lineBox.minX > this.boundingBox.maxX ||
      lineBox.maxX < this.boundingBox.minX ||
      lineBox.minY > this.boundingBox.maxY ||
      lineBox.maxY < this.boundingBox.minY
    ) {
      return false;
    }

    // Check if either endpoint is inside the polygon
    if (this.isPointInside(lineStart) || this.isPointInside(lineEnd)) {
      return true;
    }

    // Check intersection with each edge of the polygon
    for (let i = 0; i < this.vertices.length; i++) {
      const j = (i + 1) % this.vertices.length;
      const edgeStart = this.vertices[i];
      const edgeEnd = this.vertices[j];

      if (this.lineSegmentsIntersect(lineStart, lineEnd, edgeStart, edgeEnd)) {
        return true;
      }
    }

    return false;
  }

  private lineSegmentsIntersect(
    line1Start: Point2,
    line1End: Point2,
    line2Start: Point2,
    line2End: Point2
  ): boolean {
    // Calculate line orientations
    const o1 = this.getOrientation(line1Start, line1End, line2Start);
    const o2 = this.getOrientation(line1Start, line1End, line2End);
    const o3 = this.getOrientation(line2Start, line2End, line1Start);
    const o4 = this.getOrientation(line2Start, line2End, line1End);

    // General case: lines intersect if orientations are different
    if (o1 !== o2 && o3 !== o4) {
      return true;
    }

    // Special cases where points are collinear
    if (o1 === 0 && this.isPointOnSegment(line1Start, line1End, line2Start))
      return true;
    if (o2 === 0 && this.isPointOnSegment(line1Start, line1End, line2End))
      return true;
    if (o3 === 0 && this.isPointOnSegment(line2Start, line2End, line1Start))
      return true;
    if (o4 === 0 && this.isPointOnSegment(line2Start, line2End, line1End))
      return true;

    return false;
  }

  // Helper method to find orientation of ordered triplet (p, q, r)
  // Returns:
  //  0 --> Points are collinear
  //  1 --> Clockwise
  // -1 --> Counterclockwise
  private getOrientation(p: Point2, q: Point2, r: Point2): number {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (Math.abs(val) < 1e-10) return 0;
    return val > 0 ? 1 : -1;
  }

  // Helper method to check if point q lies on segment pr
  private isPointOnSegment(p: Point2, r: Point2, q: Point2): boolean {
    return (
      q.x <= Math.max(p.x, r.x) &&
      q.x >= Math.min(p.x, r.x) &&
      q.y <= Math.max(p.y, r.y) &&
      q.y >= Math.min(p.y, r.y)
    );
  }

  // Check if this polygon intersects with a circle
  intersectsWithCircle(circle: Circle): boolean {
    const { boundingBox, position, radius } = circle;

    if (
      boundingBox.minX > this.boundingBox.maxX ||
      boundingBox.maxX < this.boundingBox.minX ||
      boundingBox.minY > this.boundingBox.maxY ||
      boundingBox.maxY < this.boundingBox.minY
    ) {
      return false;
    }

    // Check if circle center is inside polygon
    if (this.isPointInside(position)) {
      return true;
    }

    // Check if any polygon edge intersects with the circle
    for (let i = 0; i < this.vertices.length; i++) {
      const j = (i + 1) % this.vertices.length;
      const edgeStart = this.vertices[i];
      const edgeEnd = this.vertices[j];

      // Calculate closest point on edge to circle center
      const edge = {
        x: edgeEnd.x - edgeStart.x,
        y: edgeEnd.y - edgeStart.y,
      };
      const edgeLength = Math.sqrt(edge.x * edge.x + edge.y * edge.y);

      // Vector from edge start to circle center
      const toCenter = {
        x: position.x - edgeStart.x,
        y: position.y - edgeStart.y,
      };

      // Project toCenter onto edge
      const dot = toCenter.x * edge.x + toCenter.y * edge.y;
      const t =
        Math.max(0, Math.min(edgeLength, dot / edgeLength)) / edgeLength;

      // Find closest point on edge
      const closest = {
        x: edgeStart.x + t * edge.x,
        y: edgeStart.y + t * edge.y,
      };

      // Check if closest point is within radius
      const dx = position.x - closest.x;
      const dy = position.y - closest.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared <= radius * radius) {
        return true;
      }
    }

    return false;
  }

  intersectsWithCircles(circles: Circle[]): boolean {
    for (const circle of circles) {
      if (this.intersectsWithCircle(circle)) {
        return true;
      }
    }

    return false;
  }
}
