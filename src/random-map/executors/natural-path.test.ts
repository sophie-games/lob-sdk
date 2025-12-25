import { NaturalPathExecutor } from "./natural-path";
import {
  InstructionType,
  InstructionNaturalPath,
  RandomScenario,
  TerrainType,
} from "@lob-sdk/types";
import { Point2 } from "@lob-sdk/vector";

// Helper function to create valid instruction objects
function createInstruction(
  overrides: Partial<InstructionNaturalPath> = {}
): InstructionNaturalPath {
  return {
    type: InstructionType.NaturalPath,
    terrain: TerrainType.Road,
    between: "edges",
    width: 1,
    amount: { min: 1, max: 1 },
    ...overrides,
  };
}

// Mock scenario for testing
const mockScenario: RandomScenario = {
  type: "RANDOM" as any,
  name: "Test Scenario",
  description: "Test scenario for unit tests",
  instructions: [],
};

describe("NaturalPathExecutor", () => {
  let mockRandom: jest.Mock;
  let mockTerrains: TerrainType[][];
  let mockHeightMap: number[][];
  let executor: NaturalPathExecutor;

  beforeEach(() => {
    // Create a mock random function that returns predictable values
    mockRandom = jest.fn();
    let counter = 0;
    mockRandom.mockImplementation(() => {
      counter++;
      return (counter % 100) / 100; // Returns 0.01, 0.02, 0.03, etc.
    });

    // Create a 10x10 test map
    mockTerrains = Array(10)
      .fill(null)
      .map(() => Array(10).fill(TerrainType.Grass));
    mockHeightMap = Array(10)
      .fill(null)
      .map((_, x) =>
        Array(10)
          .fill(null)
          .map((_, y) => {
            // Create a simple height pattern: higher in the center, lower at edges
            const centerX = 5,
              centerY = 5;
            const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            return Math.max(0, 100 - distance * 10);
          })
      );

    // Mock the random function in the executor
    jest
      .spyOn(require("@lob-sdk/seed"), "randomSeeded")
      .mockReturnValue(mockRandom);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("height filter functionality", () => {
    it("should find valid start points within height ranges", () => {
      const instruction = createInstruction({
        startHeightRanges: [{ min: 50, max: 80 }],
        endHeightRanges: [{ min: 20, max: 40 }],
      });

      executor = new NaturalPathExecutor(
        instruction,
        mockScenario,
        123,
        0,
        mockTerrains,
        mockHeightMap
      );

      // Test with a point that doesn't satisfy height range
      const invalidPoint: Point2 = { x: 0, y: 0 }; // Height should be around 100 - 5*10 = 50
      const result = (executor as any).findValidPointWithHeightFilter.call(
        executor,
        invalidPoint,
        [{ min: 50, max: 80 }],
        "edges",
        10,
        10
      );

      expect(result).not.toBeNull();
      expect(result).not.toEqual(invalidPoint);

      // Verify the found point satisfies height constraints
      const foundHeight = mockHeightMap[result!.x][result!.y];
      expect(foundHeight).toBeGreaterThanOrEqual(50);
      expect(foundHeight).toBeLessThanOrEqual(80);
    });

    it("should return original point when no height ranges specified", () => {
      const instruction = createInstruction();

      executor = new NaturalPathExecutor(
        instruction,
        mockScenario,
        123,
        0,
        mockTerrains,
        mockHeightMap
      );

      const testPoint: Point2 = { x: 5, y: 5 };

      const result = (executor as any).findValidPointWithHeightFilter.call(
        executor,
        testPoint,
        undefined
      );
      expect(result).toEqual(testPoint);
    });

    it("should return original point when it already satisfies height ranges", () => {
      const instruction = createInstruction();

      executor = new NaturalPathExecutor(
        instruction,
        mockScenario,
        123,
        0,
        mockTerrains,
        mockHeightMap
      );

      const testPoint: Point2 = { x: 5, y: 5 }; // Center point with height ~100

      const result = (executor as any).findValidPointWithHeightFilter.call(
        executor,
        testPoint,
        [{ min: 90, max: 110 }]
      );
      expect(result).toEqual(testPoint);
    });

    it("should return null when no valid points found within search radius", () => {
      const instruction = createInstruction();

      executor = new NaturalPathExecutor(
        instruction,
        mockScenario,
        123,
        0,
        mockTerrains,
        mockHeightMap
      );

      const testPoint: Point2 = { x: 0, y: 0 };

      // Search for a very specific height range that doesn't exist
      const result = (executor as any).findValidPointWithHeightFilter.call(
        executor,
        testPoint,
        [{ min: 200, max: 300 }],
        "edges",
        10,
        10
      );
      expect(result).toBeNull();
    });

    it("should handle multiple height ranges (OR logic)", () => {
      const instruction = createInstruction();

      executor = new NaturalPathExecutor(
        instruction,
        mockScenario,
        123,
        0,
        mockTerrains,
        mockHeightMap
      );

      const testPoint: Point2 = { x: 5, y: 5 }; // Height ~100

      // Should be true if point satisfies ANY of the ranges
      const result1 = (executor as any).satisfiesHeightRanges.call(
        executor,
        testPoint,
        [
          { min: 90, max: 110 }, // Point satisfies this
          { min: 200, max: 300 }, // Point doesn't satisfy this
        ]
      );
      expect(result1).toBe(true);

      // Should be false if point satisfies NONE of the ranges
      const result2 = (executor as any).satisfiesHeightRanges.call(
        executor,
        testPoint,
        [
          { min: 200, max: 300 },
          { min: 400, max: 500 },
        ]
      );
      expect(result2).toBe(false);
    });
  });

  describe("edge case handling", () => {
    it("should handle empty height ranges array", () => {
      const instruction = createInstruction({
        startHeightRanges: [],
        endHeightRanges: [],
      });

      executor = new NaturalPathExecutor(
        instruction,
        mockScenario,
        123,
        0,
        mockTerrains,
        mockHeightMap
      );

      const testPoint: Point2 = { x: 5, y: 5 };

      const result = (executor as any).findValidPointWithHeightFilter.call(
        executor,
        testPoint,
        []
      );
      expect(result).toEqual(testPoint);
    });
  });

  describe("spiral search pattern", () => {
    it("should search along edges for valid points", () => {
      const instruction = createInstruction();

      executor = new NaturalPathExecutor(
        instruction,
        mockScenario,
        123,
        0,
        mockTerrains,
        mockHeightMap
      );

      const testPoint: Point2 = { x: 5, y: 5 };

      // Create a height map where only edge points have specific heights
      const customHeightMap = Array(10)
        .fill(null)
        .map((_, x) =>
          Array(10)
            .fill(null)
            .map((_, y) => {
              // Only edge points have height 75, center has height 25
              if (x === 0 || x === 9 || y === 0 || y === 9) {
                return 75;
              }
              return 25;
            })
        );

      // Temporarily replace the height map
      (executor as any).heightMap = customHeightMap;

      const result = (executor as any).findValidPointWithHeightFilter.call(
        executor,
        testPoint,
        [{ min: 70, max: 80 }],
        "edges",
        10,
        10
      );

      expect(result).not.toBeNull();
      if (result) {
        // Should be an edge point
        expect(
          result.x === 0 || result.x === 9 || result.y === 0 || result.y === 9
        ).toBe(true);
      }
    });
  });

  describe("integration with path generation", () => {
    it("should skip path generation when no valid points found", () => {
      const instruction = createInstruction({
        startHeightRanges: [{ min: 200, max: 300 }], // Impossible range
        endHeightRanges: [{ min: 200, max: 300 }], // Impossible range
      });

      executor = new NaturalPathExecutor(
        instruction,
        mockScenario,
        123,
        0,
        mockTerrains,
        mockHeightMap
      );

      // Mock the NaturalPathGenerator to track if it's called
      const mockGeneratePath = jest.fn();
      jest
        .spyOn(require("../natural-path-generator"), "NaturalPathGenerator")
        .mockImplementation(() => ({
          generatePath: mockGeneratePath,
          getPathTiles: jest.fn(),
          getTerrainForTile: jest.fn(),
        }));

      executor.execute();

      // Should not call generatePath when no valid points found
      expect(mockGeneratePath).not.toHaveBeenCalled();
    });

    it("should generate path when valid points are found", () => {
      const instruction = createInstruction({
        startHeightRanges: [{ min: 0, max: 100 }], // Any height range
        endHeightRanges: [{ min: 0, max: 100 }], // Any height range
      });

      executor = new NaturalPathExecutor(
        instruction,
        mockScenario,
        123,
        0,
        mockTerrains,
        mockHeightMap
      );

      const mockGeneratePath = jest.fn().mockReturnValue([{ x: 5, y: 5 }]);
      const mockGetPathTiles = jest.fn().mockReturnValue([{ x: 5, y: 5 }]);
      const mockGetTerrainForTile = jest.fn().mockReturnValue(TerrainType.Road);

      jest
        .spyOn(require("../natural-path-generator"), "NaturalPathGenerator")
        .mockImplementation(() => ({
          generatePath: mockGeneratePath,
          getPathTiles: mockGetPathTiles,
          getTerrainForTile: mockGetTerrainForTile,
        }));

      executor.execute();

      // Should call generatePath when valid points found
      expect(mockGeneratePath).toHaveBeenCalled();
      expect(mockGetPathTiles).toHaveBeenCalled();
      expect(mockGetTerrainForTile).toHaveBeenCalled();
    });
  });
});
