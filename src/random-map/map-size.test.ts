import { getMapSizeIndex } from "./map-size";

describe("getMapSizeIndex", () => {
  describe("with array of length 2", () => {
    const arrayLength = 2;

    it("should return index 0 for 2 players", () => {
      expect(getMapSizeIndex(2, arrayLength)).toBe(0);
    });

    it("should return index 1 for 4 players", () => {
      expect(getMapSizeIndex(4, arrayLength)).toBe(1);
    });

    it("should return index 1 (last index) for 6 players", () => {
      expect(getMapSizeIndex(6, arrayLength)).toBe(1);
    });

    it("should return index 1 (last index) for 8 players", () => {
      expect(getMapSizeIndex(8, arrayLength)).toBe(1);
    });

    it("should return index 1 (last index) for 10 players", () => {
      expect(getMapSizeIndex(10, arrayLength)).toBe(1);
    });
  });

  describe("with array of length 3", () => {
    const arrayLength = 3;

    it("should return index 0 for 2 players", () => {
      expect(getMapSizeIndex(2, arrayLength)).toBe(0);
    });

    it("should return index 1 for 4 players", () => {
      expect(getMapSizeIndex(4, arrayLength)).toBe(1);
    });

    it("should return index 2 for 6 players", () => {
      expect(getMapSizeIndex(6, arrayLength)).toBe(2);
    });

    it("should return index 2 (last index) for 8 players", () => {
      expect(getMapSizeIndex(8, arrayLength)).toBe(2);
    });

    it("should return index 2 (last index) for 10 players", () => {
      expect(getMapSizeIndex(10, arrayLength)).toBe(2);
    });
  });

  describe("with array of length 4", () => {
    const arrayLength = 4;

    it("should return index 0 for 2 players", () => {
      expect(getMapSizeIndex(2, arrayLength)).toBe(0);
    });

    it("should return index 1 for 4 players", () => {
      expect(getMapSizeIndex(4, arrayLength)).toBe(1);
    });

    it("should return index 2 for 6 players", () => {
      expect(getMapSizeIndex(6, arrayLength)).toBe(2);
    });

    it("should return index 3 for 8 players", () => {
      expect(getMapSizeIndex(8, arrayLength)).toBe(3);
    });

    it("should return index 3 (last index) for 10 players", () => {
      expect(getMapSizeIndex(10, arrayLength)).toBe(3);
    });
  });

  describe("edge cases", () => {
    it("should return index 0 for 1 player (minimum)", () => {
      expect(getMapSizeIndex(1, 2)).toBe(0);
    });

    it("should handle single element array", () => {
      expect(getMapSizeIndex(2, 1)).toBe(0);
      expect(getMapSizeIndex(4, 1)).toBe(0);
      expect(getMapSizeIndex(10, 1)).toBe(0);
    });

    it("should handle large player counts", () => {
      expect(getMapSizeIndex(20, 2)).toBe(1);
      expect(getMapSizeIndex(100, 3)).toBe(2);
    });
  });
});


