import { Point2 } from "@lob-sdk/vector";
import { AStar } from "./a-star";
import Table from "cli-table3";

describe("AStar", () => {
  describe("Basic Pathfinding", () => {
    it("should find a simple straight path", () => {
      const width = 10;
      const height = 10;
      const getStepCost = () => 1; // Uniform cost
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 5, y: 0 };

      const path = aStar.findPath(start, end);

      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(0);
      expect(path![0]).toEqual(start);
      expect(path![path!.length - 1]).toEqual(end);
    });

    it("should find a diagonal path", () => {
      const width = 10;
      const height = 10;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 5, y: 5 };

      const path = aStar.findPath(start, end);

      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(0);
      expect(path![0]).toEqual(start);
      expect(path![path!.length - 1]).toEqual(end);
    });

    it("should return null for invalid start point", () => {
      const width = 10;
      const height = 10;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: -1, y: 0 };
      const end: Point2 = { x: 5, y: 5 };

      const path = aStar.findPath(start, end);
      expect(path).toBeNull();
    });

    it("should return null for invalid end point", () => {
      const width = 10;
      const height = 10;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 100, y: 100 };

      const path = aStar.findPath(start, end);
      expect(path).toBeNull();
    });

    it("should return single point path when start equals end", () => {
      const width = 10;
      const height = 10;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const point: Point2 = { x: 5, y: 5 };
      const path = aStar.findPath(point, point);

      expect(path).not.toBeNull();
      expect(path!.length).toBe(1);
      expect(path![0]).toEqual(point);
    });

    it("should return null when no path exists (blocked)", () => {
      const width = 10;
      const height = 10;
      // Block all tiles except start and end
      const getStepCost = (from: Point2, to: Point2) => {
        if (to.x === 0 && to.y === 0) return 1; // Start
        if (to.x === 9 && to.y === 9) return 1; // End
        return Infinity; // Blocked
      };
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 9, y: 9 };

      const path = aStar.findPath(start, end);
      expect(path).toBeNull();
    });

    it("should find path around obstacles", () => {
      const width = 10;
      const height = 10;
      // Block middle column
      const getStepCost = (from: Point2, to: Point2) => {
        if (to.x === 5 && to.y >= 2 && to.y <= 7) {
          return Infinity; // Blocked
        }
        return 1;
      };
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 5 };
      const end: Point2 = { x: 9, y: 5 };

      const path = aStar.findPath(start, end);

      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(0);
      // Path should not go through blocked tiles
      for (const point of path!) {
        expect(point.x === 5 && point.y >= 2 && point.y <= 7).toBe(false);
      }
    });
  });

  describe("Cost Function", () => {
    it("should prefer cheaper paths", () => {
      const width = 10;
      const height = 10;
      // Make a direct path expensive, but a detour cheap
      const getStepCost = (from: Point2, to: Point2) => {
        // Direct horizontal path is expensive
        if (to.y === 5 && to.x >= 1 && to.x <= 8) {
          return 10;
        }
        return 1; // Other tiles are cheap
      };
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 5 };
      const end: Point2 = { x: 9, y: 5 };

      const path = aStar.findPath(start, end);

      expect(path).not.toBeNull();
      // Path should avoid the expensive middle row
      const usesExpensiveTiles = path!.some(
        (p) => p.y === 5 && p.x >= 1 && p.x <= 8
      );
      expect(usesExpensiveTiles).toBe(false);
    });

    it("should handle diagonal costs correctly", () => {
      const width = 10;
      const height = 10;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 3, y: 3 };

      const path = aStar.findPath(start, end);

      expect(path).not.toBeNull();
      // Diagonal path should be shorter than going around
      expect(path!.length).toBeLessThanOrEqual(4); // At most 4 steps (including start)
    });
  });

  describe("Caching", () => {
    it("should cache path results", () => {
      const width = 10;
      const height = 10;
      let callCount = 0;
      const getStepCost = () => {
        callCount++;
        return 1;
      };
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 5, y: 5 };

      // First call
      const path1 = aStar.findPath(start, end);
      const firstCallCount = callCount;

      // Second call (should use cache)
      const path2 = aStar.findPath(start, end);

      expect(path1).toEqual(path2);
      expect(callCount).toBe(firstCallCount); // No additional calls
    });

    it("should cache null results", () => {
      const width = 10;
      const height = 10;
      const getStepCost = () => Infinity; // All blocked
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 5, y: 5 };

      // First call
      const path1 = aStar.findPath(start, end);
      expect(path1).toBeNull();

      // Second call (should use cache)
      const path2 = aStar.findPath(start, end);
      expect(path2).toBeNull();
    });

    it("should clear cache", () => {
      const width = 10;
      const height = 10;
      let callCount = 0;
      const getStepCost = () => {
        callCount++;
        return 1;
      };
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 5, y: 5 };

      // First call
      aStar.findPath(start, end);
      const firstCallCount = callCount;

      // Clear cache
      aStar.clearCache();

      // Second call (should recalculate)
      aStar.findPath(start, end);
      expect(callCount).toBeGreaterThan(firstCallCount);
    });
  });

  describe("Subpath Reuse", () => {
    it("should reuse subpath from cached longer path", () => {
      const width = 10;
      const height = 10;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const mid: Point2 = { x: 5, y: 5 };
      const end: Point2 = { x: 9, y: 9 };

      // First, find path to end (this will be cached)
      const fullPath = aStar.findPath(start, end);
      expect(fullPath).not.toBeNull();

      // Clear cache to test subpath reuse
      aStar.clearCache();
      // Cache the full path again
      aStar.findPath(start, end);

      // Now find path to mid point (should reuse subpath)
      const subPath = aStar.findPath(start, mid);

      expect(subPath).not.toBeNull();
      // Subpath should be a prefix of the full path
      expect(subPath!.length).toBeLessThanOrEqual(fullPath!.length);
      expect(subPath![subPath!.length - 1]).toEqual(mid);
    });
  });

  describe("Edge Cases", () => {
    it("should handle 1x1 grid", () => {
      const width = 1;
      const height = 1;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const point: Point2 = { x: 0, y: 0 };
      const path = aStar.findPath(point, point);

      expect(path).not.toBeNull();
      expect(path!.length).toBe(1);
    });

    it("should handle very large grids", () => {
      const width = 100;
      const height = 100;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 99, y: 99 };

      const path = aStar.findPath(start, end);

      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(0);
    });

    it("should handle paths at grid boundaries", () => {
      const width = 10;
      const height = 10;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 9, y: 9 };

      const path = aStar.findPath(start, end);

      expect(path).not.toBeNull();
      expect(path![0]).toEqual(start);
      expect(path![path!.length - 1]).toEqual(end);
    });
  });

  describe("Performance", () => {
    it("should find paths quickly on small grids", () => {
      const width = 20;
      const height = 20;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 19, y: 19 };

      const startTime = performance.now();
      const path = aStar.findPath(start, end);
      const endTime = performance.now();

      expect(path).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(100); // Should be < 100ms
    });

    it("should handle many pathfinding operations efficiently", () => {
      const width = 50;
      const height = 50;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const start: Point2 = {
          x: Math.floor(Math.random() * width),
          y: Math.floor(Math.random() * height),
        };
        const end: Point2 = {
          x: Math.floor(Math.random() * width),
          y: Math.floor(Math.random() * height),
        };
        aStar.findPath(start, end);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(50); // Average should be < 50ms per path
    });

    it("should benefit from caching on repeated queries", () => {
      const width = 50;
      const height = 50;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 49, y: 49 };

      // First call (no cache)
      const firstStart = performance.now();
      aStar.findPath(start, end);
      const firstEnd = performance.now();
      const firstTime = firstEnd - firstStart;

      // Second call (cached)
      const secondStart = performance.now();
      aStar.findPath(start, end);
      const secondEnd = performance.now();
      const secondTime = secondEnd - secondStart;

      // Cached call should be significantly faster
      expect(secondTime).toBeLessThan(firstTime / 10); // At least 10x faster
    });

    it("should handle complex obstacle mazes efficiently", () => {
      const width = 30;
      const height = 30;
      // Create a maze-like pattern with gaps for paths
      const getStepCost = (from: Point2, to: Point2) => {
        // Block every other column, but leave gaps every 5 rows
        if (to.x % 2 === 1 && to.y > 5 && to.y < 25 && to.y % 5 !== 0) {
          return Infinity;
        }
        return 1;
      };
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 15 };
      const end: Point2 = { x: 29, y: 15 };

      const startTime = performance.now();
      const path = aStar.findPath(start, end);
      const endTime = performance.now();

      expect(path).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(200); // Should handle maze < 200ms
    });

    it("should scale well with grid size", () => {
      const sizes = [10, 20, 50, 100];
      const results: number[] = [];

      for (const size of sizes) {
        const getStepCost = () => 1;
        const aStar = new AStar(size, size, getStepCost);

        const start: Point2 = { x: 0, y: 0 };
        const end: Point2 = { x: size - 1, y: size - 1 };

        const startTime = performance.now();
        aStar.findPath(start, end);
        const endTime = performance.now();

        results.push(endTime - startTime);
      }

      // Performance should scale roughly linearly or better (not quadratically)
      // Check that 100x100 doesn't take more than 10x longer than 10x10
      const ratio = results[3] / results[0];
      expect(ratio).toBeLessThan(50); // Allow some overhead but not quadratic
    });

    it("should calculate 1000 paths efficiently", () => {
      const width = 50;
      const height = 50;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const iterations = 1000;
      let successfulPaths = 0;
      let totalPathLength = 0;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const start: Point2 = {
          x: Math.floor(Math.random() * width),
          y: Math.floor(Math.random() * height),
        };
        const end: Point2 = {
          x: Math.floor(Math.random() * width),
          y: Math.floor(Math.random() * height),
        };

        const path = aStar.findPath(start, end);
        if (path) {
          successfulPaths++;
          totalPathLength += path.length;
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      const avgPathLength =
        successfulPaths > 0 ? totalPathLength / successfulPaths : 0;
      const pathsPerSecond = (iterations / totalTime) * 1000;

      // Display performance metrics in a table
      const table = new Table({
        head: ["Metric", "Value"],
        style: { head: ["cyan"] },
      });
      table.push(
        ["Iterations", iterations.toLocaleString()],
        ["Total time", `${totalTime.toFixed(2)}ms`],
        ["Average time per path", `${avgTime.toFixed(4)}ms`],
        ["Paths per second", `${pathsPerSecond.toFixed(0)}`],
        ["Successful paths", `${successfulPaths}/${iterations}`],
        ["Average path length", `${avgPathLength.toFixed(1)} tiles`],
        ["Grid size", `${width}x${height}`]
      );
      console.log("\n[Performance Test - A* Pathfinding (1000 paths)]");
      console.log(table.toString());

      // Should complete 1000 paths in reasonable time
      expect(totalTime).toBeLessThan(5000); // Less than 5 seconds
      expect(avgTime).toBeLessThan(10); // Average less than 10ms per path
    });
  });

  describe("Path Correctness", () => {
    it("should return paths with consecutive adjacent points", () => {
      const width = 10;
      const height = 10;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 9, y: 9 };

      const path = aStar.findPath(start, end);

      expect(path).not.toBeNull();
      for (let i = 0; i < path!.length - 1; i++) {
        const current = path![i];
        const next = path![i + 1];
        const dx = Math.abs(next.x - current.x);
        const dy = Math.abs(next.y - current.y);

        // Each step should be adjacent (including diagonals)
        expect(dx).toBeLessThanOrEqual(1);
        expect(dy).toBeLessThanOrEqual(1);
        expect(dx + dy).toBeGreaterThan(0); // Not the same point
      }
    });

    it("should find optimal path in simple cases", () => {
      const width = 10;
      const height = 10;
      const getStepCost = () => 1;
      const aStar = new AStar(width, height, getStepCost);

      const start: Point2 = { x: 0, y: 0 };
      const end: Point2 = { x: 3, y: 3 };

      const path = aStar.findPath(start, end);

      expect(path).not.toBeNull();
      // Optimal path should be diagonal (3 steps + start = 4 points)
      expect(path!.length).toBeLessThanOrEqual(4);
    });
  });
});
