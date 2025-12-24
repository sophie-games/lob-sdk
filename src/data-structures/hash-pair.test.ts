import { HashPair } from "./hash-pair";

describe("HashPair", () => {
  describe("with number type", () => {
    it("should add and retrieve pairs correctly", () => {
      const hashPair = new HashPair<number>();
      
      hashPair.addPair(1, 2);
      hashPair.addPair(2, 3);
      
      expect(hashPair.hasPair(1, 2)).toBe(true);
      expect(hashPair.hasPair(2, 1)).toBe(true); // Bidirectional
      expect(hashPair.hasPair(2, 3)).toBe(true);
      expect(hashPair.hasPair(1, 3)).toBe(false);
    });

    it("should return all pairs correctly", () => {
      const hashPair = new HashPair<number>();
      
      hashPair.addPair(1, 2);
      hashPair.addPair(2, 3);
      hashPair.addPair(3, 1);
      
      const pairs = hashPair.getAllPairs();
      
      expect(pairs).toHaveLength(3);
      expect(pairs).toEqual(expect.arrayContaining([[1, 2]]));
      expect(pairs).toEqual(expect.arrayContaining([[1, 3]]));
      expect(pairs).toEqual(expect.arrayContaining([[2, 3]]));
    });

    it("should handle duplicate pairs", () => {
      const hashPair = new HashPair<number>();
      
      hashPair.addPair(1, 2);
      hashPair.addPair(2, 1); // Duplicate
      
      expect(hashPair.size).toBe(1);
      expect(hashPair.hasPair(1, 2)).toBe(true);
    });

    it("should skip self-pairs", () => {
      const hashPair = new HashPair<number>();
      
      hashPair.addPair(1, 1);
      
      expect(hashPair.size).toBe(0);
      expect(hashPair.hasPair(1, 1)).toBe(false);
    });

    it("should remove pairs correctly", () => {
      const hashPair = new HashPair<number>();
      
      hashPair.addPair(1, 2);
      hashPair.addPair(2, 3);
      
      hashPair.removePair(1, 2);
      
      expect(hashPair.hasPair(1, 2)).toBe(false);
      expect(hashPair.hasPair(2, 1)).toBe(false);
      expect(hashPair.hasPair(2, 3)).toBe(true);
      expect(hashPair.size).toBe(1);
    });

    it("should clear all pairs", () => {
      const hashPair = new HashPair<number>();
      
      hashPair.addPair(1, 2);
      hashPair.addPair(2, 3);
      
      hashPair.clear();
      
      expect(hashPair.size).toBe(0);
      expect(hashPair.isEmpty()).toBe(true);
      expect(hashPair.hasPair(1, 2)).toBe(false);
    });

    it("should work with constructor initialization", () => {
      const hashPair = new HashPair<number>([[1, 2], [2, 3]]);
      
      expect(hashPair.hasPair(1, 2)).toBe(true);
      expect(hashPair.hasPair(2, 3)).toBe(true);
      expect(hashPair.size).toBe(2);
    });
  });

  describe("with string type", () => {
    it("should work with string types", () => {
      const hashPair = new HashPair<string>();
      
      hashPair.addPair("unit1", "unit2");
      hashPair.addPair("unit2", "unit3");
      
      expect(hashPair.hasPair("unit1", "unit2")).toBe(true);
      expect(hashPair.hasPair("unit2", "unit1")).toBe(true);
      expect(hashPair.hasPair("unit2", "unit3")).toBe(true);
    });
  });

  describe("performance characteristics", () => {
    it("should handle large numbers of pairs efficiently", () => {
      const hashPair = new HashPair<number>();
      const pairs: [number, number][] = [];
      
      // Create 1000 pairs
      for (let i = 0; i < 1000; i++) {
        pairs.push([i, i + 1]);
      }
      
      const start = performance.now();
      pairs.forEach(([a, b]) => hashPair.addPair(a, b));
      const addTime = performance.now() - start;
      
      expect(hashPair.size).toBe(1000);
      expect(addTime).toBeLessThan(100); // Should be very fast
      
      const lookupStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        hashPair.hasPair(i, i + 1);
      }
      const lookupTime = performance.now() - lookupStart;
      
      expect(lookupTime).toBeLessThan(50); // Lookups should be very fast
    });
  });
}); 