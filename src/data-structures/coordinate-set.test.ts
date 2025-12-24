import { CoordinateSet } from "./coordinate-set";

describe("CoordinateSet", () => {
  describe("basic operations", () => {
    it("should add and retrieve coordinates correctly", () => {
      const coordSet = new CoordinateSet();
      
      coordSet.add(1, 2);
      coordSet.add(2, 3);
      
      expect(coordSet.has(1, 2)).toBe(true);
      expect(coordSet.has(2, 3)).toBe(true);
      expect(coordSet.has(2, 1)).toBe(false); // Order matters!
      expect(coordSet.has(3, 2)).toBe(false); // Order matters!
    });

    it("should return all coordinates correctly", () => {
      const coordSet = new CoordinateSet();
      
      coordSet.add(1, 2);
      coordSet.add(2, 3);
      coordSet.add(3, 1);
      
      const coordinates = coordSet.getAllCoordinates();
      
      expect(coordinates).toHaveLength(3);
      expect(coordinates).toEqual(expect.arrayContaining([[1, 2]]));
      expect(coordinates).toEqual(expect.arrayContaining([[2, 3]]));
      expect(coordinates).toEqual(expect.arrayContaining([[3, 1]]));
    });

    it("should handle duplicate coordinates", () => {
      const coordSet = new CoordinateSet();
      
      coordSet.add(1, 2);
      coordSet.add(1, 2); // Duplicate
      
      expect(coordSet.size).toBe(1);
      expect(coordSet.has(1, 2)).toBe(true);
    });

    it("should remove coordinates correctly", () => {
      const coordSet = new CoordinateSet();
      
      coordSet.add(1, 2);
      coordSet.add(2, 3);
      
      coordSet.remove(1, 2);
      
      expect(coordSet.has(1, 2)).toBe(false);
      expect(coordSet.has(2, 3)).toBe(true);
      expect(coordSet.size).toBe(1);
    });

    it("should clear all coordinates", () => {
      const coordSet = new CoordinateSet();
      
      coordSet.add(1, 2);
      coordSet.add(2, 3);
      
      coordSet.clear();
      
      expect(coordSet.size).toBe(0);
      expect(coordSet.isEmpty()).toBe(true);
      expect(coordSet.has(1, 2)).toBe(false);
    });

    it("should work with constructor initialization", () => {
      const coordSet = new CoordinateSet([[1, 2], [2, 3]]);
      
      expect(coordSet.has(1, 2)).toBe(true);
      expect(coordSet.has(2, 3)).toBe(true);
      expect(coordSet.size).toBe(2);
    });
  });

  describe("coordinate order matters", () => {
    it("should treat (1,2) and (2,1) as different coordinates", () => {
      const coordSet = new CoordinateSet();
      
      coordSet.add(1, 2);
      
      expect(coordSet.has(1, 2)).toBe(true);
      expect(coordSet.has(2, 1)).toBe(false); // Different coordinate!
      
      coordSet.add(2, 1);
      
      expect(coordSet.has(1, 2)).toBe(true);
      expect(coordSet.has(2, 1)).toBe(true);
      expect(coordSet.size).toBe(2);
    });

    it("should handle negative coordinates", () => {
      const coordSet = new CoordinateSet();
      
      coordSet.add(-1, 2);
      coordSet.add(1, -2);
      
      expect(coordSet.has(-1, 2)).toBe(true);
      expect(coordSet.has(1, -2)).toBe(true);
      expect(coordSet.has(2, -1)).toBe(false);
    });
  });

  describe("iterator support", () => {
    it("should support iteration", () => {
      const coordSet = new CoordinateSet([[1, 2], [2, 3], [3, 1]]);
      const coordinates: [number, number][] = [];
      
      for (const coord of coordSet) {
        coordinates.push(coord);
      }
      
      expect(coordinates).toHaveLength(3);
      expect(coordinates).toEqual(expect.arrayContaining([[1, 2]]));
      expect(coordinates).toEqual(expect.arrayContaining([[2, 3]]));
      expect(coordinates).toEqual(expect.arrayContaining([[3, 1]]));
    });
  });

  describe("performance characteristics", () => {
    it("should handle large numbers of coordinates efficiently", () => {
      const coordSet = new CoordinateSet();
      const coordinates: [number, number][] = [];
      
      // Create 1000 coordinates
      for (let i = 0; i < 1000; i++) {
        coordinates.push([i, i + 1]);
      }
      
      const start = performance.now();
      coordinates.forEach(([x, y]) => coordSet.add(x, y));
      const addTime = performance.now() - start;
      
      expect(coordSet.size).toBe(1000);
      expect(addTime).toBeLessThan(100); // Should be very fast
      
      const lookupStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        coordSet.has(i, i + 1);
      }
      const lookupTime = performance.now() - lookupStart;
      
      expect(lookupTime).toBeLessThan(50); // Lookups should be very fast
    });
  });
}); 