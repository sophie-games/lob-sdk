import { Point2 } from "@lob-sdk/vector";
import { douglasPeucker } from "./douglas-peucker";

describe("Douglas-Peucker Algorithm", () => {
  describe("douglasPeucker", () => {
    it("should return the same array for paths with less than 3 points", () => {
      const path1: Point2[] = [];
      const path2: Point2[] = [{ x: 1, y: 2 }];
      const path3: Point2[] = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ];

      expect(douglasPeucker(path1)).toEqual(path1);
      expect(douglasPeucker(path2)).toEqual(path2);
      expect(douglasPeucker(path3)).toEqual(path3);
    });

    it("should simplify a straight line to just start and end points", () => {
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
        { x: 4, y: 4 },
      ];
      const result = douglasPeucker(path, 0.1);
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 4, y: 4 },
      ]);
    });

    it("should preserve significant deviations from the line", () => {
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0.1 }, // Small deviation
        { x: 2, y: 2 }, // Large deviation
        { x: 3, y: 0.1 }, // Small deviation
        { x: 4, y: 0 },
      ];
      const result = douglasPeucker(path, 0.5);
      // The algorithm preserves all points because the perpendicular distances
      // are calculated correctly and the epsilon threshold is not exceeded
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0.1 },
        { x: 2, y: 2 },
        { x: 3, y: 0.1 },
        { x: 4, y: 0 },
      ]);
    });

    it("should handle different epsilon values", () => {
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0.3 },
        { x: 2, y: 0.6 },
        { x: 3, y: 0.9 },
        { x: 4, y: 0 },
      ];

      // With small epsilon, more points are preserved
      const result1 = douglasPeucker(path, 0.1);
      expect(result1.length).toBeGreaterThan(2);

      // With large epsilon, only start and end points remain
      const result2 = douglasPeucker(path, 2.0);
      expect(result2).toEqual([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
      ]);
    });

    it("should handle complex paths with multiple curves", () => {
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0.1 },
        { x: 2, y: 1.5 }, // Peak
        { x: 3, y: 0.1 },
        { x: 4, y: 0 },
        { x: 5, y: -0.1 },
        { x: 6, y: -1.5 }, // Valley
        { x: 7, y: -0.1 },
        { x: 8, y: 0 },
      ];
      const result = douglasPeucker(path, 0.5);
      // The algorithm removes the point { x: 4, y: 0 } because it's collinear with { x: 3, y: 0.1 } and { x: 5, y: -0.1 }
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0.1 },
        { x: 2, y: 1.5 },
        { x: 3, y: 0.1 },
        { x: 5, y: -0.1 },
        { x: 6, y: -1.5 },
        { x: 7, y: -0.1 },
        { x: 8, y: 0 },
      ]);
    });

    it("should work with extended Point2 objects", () => {
      interface ExtendedPoint extends Point2 {
        id: string;
      }

      const path: ExtendedPoint[] = [
        { x: 0, y: 0, id: "start" },
        { x: 1, y: 0.1, id: "point1" },
        { x: 2, y: 2, id: "peak" },
        { x: 3, y: 0.1, id: "point2" },
        { x: 4, y: 0, id: "end" },
      ];
      const result = douglasPeucker(path, 0.5);
      // The algorithm preserves all points because the perpendicular distances
      // are calculated correctly and the epsilon threshold is not exceeded
      expect(result).toEqual([
        { x: 0, y: 0, id: "start" },
        { x: 1, y: 0.1, id: "point1" },
        { x: 2, y: 2, id: "peak" },
        { x: 3, y: 0.1, id: "point2" },
        { x: 4, y: 0, id: "end" },
      ]);
    });

    it("should handle vertical lines", () => {
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 0, y: 3 },
        { x: 0, y: 4 },
      ];
      const result = douglasPeucker(path, 0.1);
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 4 },
      ]);
    });

    it("should handle horizontal lines", () => {
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
      ];
      const result = douglasPeucker(path, 0.1);
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
      ]);
    });

    it("should handle single point deviations", () => {
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 1 }, // Single deviation
        { x: 3, y: 0 },
        { x: 4, y: 0 },
      ];
      const result = douglasPeucker(path, 0.5);
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 2, y: 1 },
        { x: 4, y: 0 },
      ]);
    });

    it("should use default epsilon of 0.5", () => {
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0.3 },
        { x: 2, y: 0.6 },
        { x: 3, y: 0.9 },
        { x: 4, y: 0 },
      ];
      const result1 = douglasPeucker(path);
      const result2 = douglasPeucker(path, 0.5);
      expect(result1).toEqual(result2);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle empty arrays", () => {
      expect(douglasPeucker([])).toEqual([]);
    });

    it("should handle single point arrays", () => {
      const singlePointObj = [{ x: 1, y: 2 }];
      expect(douglasPeucker(singlePointObj)).toEqual(singlePointObj);
    });

    it("should handle two point arrays", () => {
      const twoPointsObj = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ];
      expect(douglasPeucker(twoPointsObj)).toEqual(twoPointsObj);
    });

    it("should handle very small epsilon values", () => {
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0.001 },
        { x: 2, y: 0.002 },
        { x: 3, y: 0.001 },
        { x: 4, y: 0 },
      ];
      const result = douglasPeucker(path, 0.0001);
      expect(result.length).toBeGreaterThan(2);
    });

    it("should handle very large epsilon values", () => {
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 1 },
        { x: 4, y: 0 },
      ];
      const result = douglasPeucker(path, 1000);
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
      ]);
    });

    it("should handle zero epsilon", () => {
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0.1 },
        { x: 2, y: 0.2 },
        { x: 3, y: 0.1 },
        { x: 4, y: 0 },
      ];
      const result = douglasPeucker(path, 0);
      expect(result.length).toBeGreaterThan(2);
    });
  });

  describe("Mathematical accuracy", () => {
    it("should correctly calculate perpendicular distance", () => {
      // Test case: point (1, 1) to line from (0, 0) to (2, 0)
      // Expected distance: 1 (perpendicular distance from point to horizontal line)
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 1, y: 1 }, // This point should be preserved with epsilon < 1
        { x: 2, y: 0 },
      ];
      const result = douglasPeucker(path, 0.5);
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 },
      ]);
    });

    it("should handle collinear points correctly", () => {
      const path: Point2[] = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
        { x: 4, y: 4 },
      ];
      const result = douglasPeucker(path, 0.1);
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 4, y: 4 },
      ]);
    });
  });
});
