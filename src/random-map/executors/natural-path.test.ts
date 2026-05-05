import { NaturalPathExecutor } from "./natural-path";
import {
  InstructionType,
  InstructionNaturalPath,
  Scenario,
  TerrainType,
  Size,
} from "@lob-sdk/types";
import { SCENARIO_SCHEMA_VERSION } from "@lob-sdk/scenario";

// Helper function to create valid instruction objects
function createInstruction(
  overrides: Partial<InstructionNaturalPath> = {},
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
const mockScenario: Scenario = {
  version: SCENARIO_SCHEMA_VERSION,
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
          }),
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
    it("should return null when no valid points found within search range", () => {
      const instruction = createInstruction();

      executor = new NaturalPathExecutor(
        instruction,
        mockScenario,
        123,
        0,
        mockTerrains,
        mockHeightMap,
        Size.Medium,
      );

      // Search the full map for an impossible height range — must be null.
      const result = (executor as any).findValidPointWithHeightFilter.call(
        executor,
        { min: 0, max: 100 },
        { min: 0, max: 100 },
        [{ min: 200, max: 300 }],
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
        mockHeightMap,
        Size.Medium,
      );

      const testPoint = { x: 5, y: 5 }; // Height ~100

      // Should be true if point satisfies ANY of the ranges
      const result1 = (executor as any).satisfiesHeightRanges.call(
        executor,
        testPoint,
        [
          { min: 90, max: 110 }, // Point satisfies this
          { min: 200, max: 300 }, // Point doesn't satisfy this
        ],
      );
      expect(result1).toBe(true);

      // Should be false if point satisfies NONE of the ranges
      const result2 = (executor as any).satisfiesHeightRanges.call(
        executor,
        testPoint,
        [
          { min: 200, max: 300 },
          { min: 400, max: 500 },
        ],
      );
      expect(result2).toBe(false);
    });
  });

  describe("integration with path generation", () => {
    it("should skip path generation when no valid points found", () => {
      const instruction = createInstruction({
        terrain: 4,
        startHeightRanges: [{ min: 200, max: 300 }], // Impossible range
        endHeightRanges: [{ min: 200, max: 300 }], // Impossible range
      });

      executor = new NaturalPathExecutor(
        instruction,
        mockScenario,
        123,
        0,
        mockTerrains,
        mockHeightMap,
        Size.Medium,
      );

      executor.execute();

      // No tile should have been written with the Road terrain id (4).
      expect(mockTerrains.flat()).not.toContain(4);
    });
  });
});
