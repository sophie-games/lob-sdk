import { Vector2 } from "./vector2";

describe("Vector2", () => {
  describe("normalize()", () => {
    it("should normalize a vector with positive components", () => {
      const vector = new Vector2(3, 4);
      const normalized = vector.normalize();

      // Length of (3,4) is 5, so normalized should be (3/5, 4/5)
      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);

      // Verify the length of normalized vector is 1
      expect(normalized.length()).toBeCloseTo(1);
    });

    it("should normalize a vector with negative components", () => {
      const vector = new Vector2(-6, -8);
      const normalized = vector.normalize();

      // Length of (-6,-8) is 10, so normalized should be (-6/10, -8/10)
      expect(normalized.x).toBeCloseTo(-0.6);
      expect(normalized.y).toBeCloseTo(-0.8);

      // Verify the length of normalized vector is 1
      expect(normalized.length()).toBeCloseTo(1);
    });

    it("should normalize a vector with mixed sign components", () => {
      const vector = new Vector2(-2, 2);
      const normalized = vector.normalize();

      // Length of (-2,2) is 2√2, so normalized should be (-1/√2, 1/√2)
      expect(normalized.x).toBeCloseTo(-0.7071067811865475);
      expect(normalized.y).toBeCloseTo(0.7071067811865475);

      // Verify the length of normalized vector is 1
      expect(normalized.length()).toBeCloseTo(1);
    });

    it("should handle unit vectors without changing them", () => {
      const vector = new Vector2(1, 0);
      const normalized = vector.normalize();

      expect(normalized.x).toBe(1);
      expect(normalized.y).toBe(0);
      expect(normalized.length()).toBe(1);
    });

    it("should return zero vector when normalizing zero vector", () => {
      const vector = new Vector2(0, 0);
      const normalized = vector.normalize();

      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
      expect(normalized.length()).toBe(0);
    });

    it("should maintain direction after normalization", () => {
      const vector = new Vector2(5, 5);
      const normalized = vector.normalize();

      // For a 45-degree vector, x and y components should be equal
      expect(normalized.x).toBeCloseTo(normalized.y);
      expect(normalized.length()).toBeCloseTo(1);
    });
  });
});
