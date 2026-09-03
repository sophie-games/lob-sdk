import {
  polygonArea,
  convexPolygonIntersection,
  convexOverlapRatio,
} from "./utils";
import { Point2 } from "@lob-sdk/vector";

const square = (x: number, y: number, size: number): Point2[] => [
  { x, y },
  { x: x + size, y },
  { x: x + size, y: y + size },
  { x, y: y + size },
];

describe("polygon utils", () => {
  describe("polygonArea", () => {
    it("computes a square area", () => {
      expect(polygonArea(square(0, 0, 10))).toBe(100);
    });

    it("computes a triangle area", () => {
      expect(
        polygonArea([
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 0, y: 10 },
        ]),
      ).toBe(50);
    });
  });

  describe("convexOverlapRatio", () => {
    it("is 1 for identical shapes", () => {
      expect(convexOverlapRatio(square(0, 0, 10), square(0, 0, 10))).toBe(1);
    });

    it("is 0.5 for a half overlap along one axis", () => {
      expect(convexOverlapRatio(square(0, 0, 10), square(5, 0, 10))).toBeCloseTo(
        0.5,
      );
    });

    it("is 0.25 for a quarter overlap", () => {
      expect(convexOverlapRatio(square(0, 0, 10), square(5, 5, 10))).toBeCloseTo(
        0.25,
      );
    });

    it("is 0 for shapes that only touch along an edge", () => {
      expect(convexOverlapRatio(square(0, 0, 10), square(10, 0, 10))).toBe(0);
    });

    it("is 0 for disjoint shapes", () => {
      expect(convexOverlapRatio(square(0, 0, 10), square(20, 0, 10))).toBe(0);
    });

    it("is 1 when one shape is fully contained in the other", () => {
      expect(convexOverlapRatio(square(0, 0, 10), square(2, 2, 4))).toBe(1);
    });

    it("handles a rotated (diamond) shape contained in a square", () => {
      // Diamond inscribed in the 10x10 square (vertices at edge midpoints).
      const diamond: Point2[] = [
        { x: 5, y: 0 },
        { x: 10, y: 5 },
        { x: 5, y: 10 },
        { x: 0, y: 5 },
      ];
      // Diamond area = 50, fully inside the square ⇒ ratio of the smaller = 1.
      expect(convexOverlapRatio(square(0, 0, 10), diamond)).toBeCloseTo(1);
    });
  });

  describe("convexPolygonIntersection", () => {
    it("returns the overlapping rectangle for a half overlap", () => {
      const inter = convexPolygonIntersection(
        square(0, 0, 10),
        square(5, 0, 10),
      );
      expect(polygonArea(inter)).toBeCloseTo(50);
    });

    it("returns [] for disjoint shapes", () => {
      expect(
        convexPolygonIntersection(square(0, 0, 10), square(20, 0, 10)).length,
      ).toBe(0);
    });
  });
});
