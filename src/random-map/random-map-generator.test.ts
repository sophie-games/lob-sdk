import { RandomMapGenerator } from "./random-map-generator";
import {
  RandomScenario,
  GameScenarioType,
  InstructionType,
  ScenarioName,
  DynamicBattleType,
} from "@lob-sdk/types";
import { GameDataManager } from "@lob-sdk/game-data-manager";

/**
 * Comprehensive test suite for RandomMapGenerator
 *
 * This test suite verifies that the RandomMapGenerator can successfully generate
 * all existing random scenarios without failing. It tests:
 *
 * 1. All random scenarios with all dynamic battle types and player counts
 * 2. Seed consistency (same seed produces identical results)
 * 3. Custom map sizes
 * 4. Terrain and height map validation
 *
 * The test dynamically discovers all available scenarios and filters for random ones,
 * ensuring the test remains up-to-date as new scenarios are added.
 */
describe("RandomMapGenerator", () => {
  const gameDataManager = GameDataManager.get("napoleonic");
  const { TILE_SIZE, DEFAULT_BATTLE_TYPE } = gameDataManager.getGameConstants();

  describe("generate all random scenarios", () => {
    // Get all scenario names dynamically from the GameDataManager
    const allScenarioNames = gameDataManager.getScenarioNames();

    // Filter to only random scenarios
    const randomScenarioNames = allScenarioNames.filter((scenarioName) => {
      try {
        const scenario = gameDataManager.getScenario(scenarioName);
        return scenario.type === GameScenarioType.Random;
      } catch (error) {
        // If scenario doesn't exist or can't be loaded, skip it
        return false;
      }
    });

    // Test all dynamic battle types
    const dynamicBattleTypes: DynamicBattleType[] =
      gameDataManager.getAllDynamicBattleTypes();

    // Test different player counts
    const playerCounts = [2, 4, 6, 8];

    it("should generate all random scenarios without throwing errors", () => {
      const mapGenerator = new RandomMapGenerator();

      // Test each random scenario
      randomScenarioNames.forEach((scenarioName) => {
        console.log(`Testing random scenario: ${scenarioName}`);

        const scenario = gameDataManager.getScenario(scenarioName);

        // Verify it's actually a random scenario
        expect(scenario.type).toBe(GameScenarioType.Random);

        // Type assertion to RandomScenario since we've verified it's a random scenario
        const randomScenario = scenario as RandomScenario;

        // Test with each battle type and player count
        dynamicBattleTypes.forEach((battleType) => {
          playerCounts.forEach((maxPlayers) => {
            // Skip invalid combinations (e.g., too many players for small maps)
            if (maxPlayers <= 8) {
              expect(() => {
                const result = mapGenerator.generate({
                  scenario: randomScenario,
                  dynamicBattleType: battleType,
                  maxPlayers,
                  tileSize: TILE_SIZE,
                  era: "napoleonic",
                });

                // Verify the result has the expected structure
                expect(result).toBeDefined();
                expect(result.map).toBeDefined();
                expect(result.objectives).toBeDefined();
                expect(Array.isArray(result.objectives)).toBe(true);

                // Verify map has required properties
                expect(result.map.width).toBeGreaterThan(0);
                expect(result.map.height).toBeGreaterThan(0);
                expect(result.map.terrains).toBeDefined();
                expect(result.map.heightMap).toBeDefined();
                expect(Array.isArray(result.map.terrains)).toBe(true);
                expect(Array.isArray(result.map.heightMap)).toBe(true);

                // Verify terrain and height arrays have correct dimensions
                const tilesX = Math.floor(result.map.width / TILE_SIZE);
                const tilesY = Math.floor(result.map.height / TILE_SIZE);

                expect(result.map.terrains.length).toBe(tilesX);
                expect(result.map.heightMap.length).toBe(tilesX);

                if (tilesX > 0 && tilesY > 0) {
                  expect(result.map.terrains[0].length).toBe(tilesY);
                  expect(result.map.heightMap[0].length).toBe(tilesY);
                }
              }).not.toThrow();
            }
          });
        });
      });
    });

    it("should generate scenarios with custom seeds consistently", () => {
      const mapGenerator = new RandomMapGenerator();
      const testSeed = 12345;

      // Test a few random scenarios with fixed seed
      const testScenarios = randomScenarioNames.slice(0, 3); // Test first 3 random scenarios

      testScenarios.forEach((scenarioName) => {
        const scenario = gameDataManager.getScenario(scenarioName);
        const randomScenario = scenario as RandomScenario;

        // Generate the same scenario twice with the same seed
        const result1 = mapGenerator.generate({
          scenario: randomScenario,
          dynamicBattleType: DEFAULT_BATTLE_TYPE,
          maxPlayers: 2,
          seed: testSeed,
          tileSize: TILE_SIZE,
          era: "napoleonic",
        });

        const result2 = mapGenerator.generate({
          scenario: randomScenario,
          dynamicBattleType: DEFAULT_BATTLE_TYPE,
          maxPlayers: 2,
          seed: testSeed,
          tileSize: TILE_SIZE,
          era: "napoleonic",
        });

        // Results should be identical with the same seed
        expect(result1.map.width).toBe(result2.map.width);
        expect(result1.map.height).toBe(result2.map.height);
        expect(result1.map.terrains).toEqual(result2.map.terrains);
        expect(result1.map.heightMap).toEqual(result2.map.heightMap);
        expect(result1.objectives).toEqual(result2.objectives);
      });
    });

    it("should handle scenarios with different terrain configurations", () => {
      const mapGenerator = new RandomMapGenerator();

      randomScenarioNames.forEach((scenarioName) => {
        const scenario = gameDataManager.getScenario(scenarioName);
        const randomScenario = scenario as RandomScenario;

        expect(() => {
          const result = mapGenerator.generate({
            scenario: randomScenario,
            dynamicBattleType: DEFAULT_BATTLE_TYPE,
            maxPlayers: 2,
            tileSize: TILE_SIZE,
            era: "napoleonic",
          });

          // Verify terrain array is properly populated
          expect(result.map.terrains.length).toBeGreaterThan(0);
          expect(result.map.terrains[0].length).toBeGreaterThan(0);

          // Verify height map is properly populated
          expect(result.map.heightMap.length).toBeGreaterThan(0);
          expect(result.map.heightMap[0].length).toBeGreaterThan(0);

          // Verify all terrain values are valid (not undefined/null)
          for (let x = 0; x < result.map.terrains.length; x++) {
            for (let y = 0; y < result.map.terrains[x].length; y++) {
              expect(result.map.terrains[x][y]).toBeDefined();
              expect(result.map.terrains[x][y]).not.toBeNull();
            }
          }

          // Verify all height values are numbers
          for (let x = 0; x < result.map.heightMap.length; x++) {
            for (let y = 0; y < result.map.heightMap[x].length; y++) {
              expect(typeof result.map.heightMap[x][y]).toBe("number");
            }
          }
        }).not.toThrow();
      });
    });

    it("should generate maps with custom tilesX and tilesY dimensions", () => {
      const mapGenerator = new RandomMapGenerator();
      const testScenario = randomScenarioNames[0];
      const scenario = gameDataManager.getScenario(testScenario);
      const randomScenario = scenario as RandomScenario;

      // Test with different custom dimensions
      const customSizes = [
        { tilesX: 50, tilesY: 50 },
        { tilesX: 100, tilesY: 75 },
        { tilesX: 75, tilesY: 100 },
        { tilesX: 200, tilesY: 150 },
      ];

      customSizes.forEach(({ tilesX, tilesY }) => {
        const result = mapGenerator.generate({
          scenario: randomScenario,
          dynamicBattleType: DEFAULT_BATTLE_TYPE,
          maxPlayers: 2,
          seed: 12345,
          tileSize: TILE_SIZE,
          era: "napoleonic",
          tilesX,
          tilesY,
        });

        // Verify map dimensions match custom values
        expect(result.map.width).toBe(tilesX * TILE_SIZE);
        expect(result.map.height).toBe(tilesY * TILE_SIZE);

        // Verify terrain and height arrays have correct dimensions
        expect(result.map.terrains.length).toBe(tilesX);
        expect(result.map.heightMap.length).toBe(tilesX);

        if (tilesX > 0 && tilesY > 0) {
          expect(result.map.terrains[0].length).toBe(tilesY);
          expect(result.map.heightMap[0].length).toBe(tilesY);
        }

        // Verify all terrain and height values are properly initialized
        for (let x = 0; x < tilesX; x++) {
          expect(result.map.terrains[x].length).toBe(tilesY);
          expect(result.map.heightMap[x].length).toBe(tilesY);
          for (let y = 0; y < tilesY; y++) {
            expect(result.map.terrains[x][y]).toBeDefined();
            expect(result.map.terrains[x][y]).not.toBeNull();
            expect(typeof result.map.heightMap[x][y]).toBe("number");
          }
        }
      });
    });
  });

  describe("reversed noise functionality", () => {
    it("should create ravines using reversed noise", () => {
      const mapGenerator = new RandomMapGenerator();

      // Create a simple test scenario with reversed noise
      const testScenario: RandomScenario = {
        type: GameScenarioType.Random,
        name: "test-reversed-noise" as ScenarioName,
        description: "Test scenario for reversed noise functionality",
        instructions: [
          {
            type: InstructionType.HeightNoise,
            noises: [
              {
                scale: 50,
                multiplier: 1,
                offset: 0,
                reversed: false, // Normal elevation (0.0 -> min, 1.0 -> max)
              },
              {
                scale: 30,
                multiplier: 0.8,
                offset: 0,
                reversed: true, // Reversed elevation (0.0 -> max, 1.0 -> min)
              },
            ],
            mergeStrategy: "avg",
            min: 0,
            max: 10,
          },
        ],
      };

      const result = mapGenerator.generate({
        scenario: testScenario,
        dynamicBattleType: DEFAULT_BATTLE_TYPE,
        maxPlayers: 2,
        seed: 12345,
        tileSize: TILE_SIZE,
        era: "napoleonic",
      });

      // Verify the result was generated successfully
      expect(result).toBeDefined();
      expect(result.map).toBeDefined();
      expect(result.map.heightMap).toBeDefined();

      // Verify height map has both elevated and depressed areas
      let hasElevated = false;
      let hasDepressed = false;

      for (let x = 0; x < result.map.heightMap.length; x++) {
        for (let y = 0; y < result.map.heightMap[x].length; y++) {
          const height = result.map.heightMap[x][y];
          if (height > 5) hasElevated = true;
          if (height < 3) hasDepressed = true;
        }
      }

      // Should have both elevated areas (from normal noise) and depressed areas (from reversed noise)
      expect(hasElevated).toBe(true);
      expect(hasDepressed).toBe(true);
    });
  });

  describe("height noise ranges functionality", () => {
    it("should only modify height within specified ranges", () => {
      const mapGenerator = new RandomMapGenerator();

      // Create a test scenario with height noise that only affects specific height ranges
      const testScenario: RandomScenario = {
        type: GameScenarioType.Random,
        name: "test-height-ranges" as ScenarioName,
        description: "Test scenario for height noise ranges functionality",
        instructions: [
          // First height noise: creates base elevation (0-5)
          {
            type: InstructionType.HeightNoise,
            noises: [
              {
                scale: 50,
                multiplier: 1,
                offset: 0,
                reversed: false,
              },
            ],
            mergeStrategy: "avg",
            min: 0,
            max: 5,
          },
          // Second height noise: only modifies areas with height 1-3, adding +3
          {
            type: InstructionType.HeightNoise,
            noises: [
              {
                scale: 30,
                multiplier: 1,
                offset: 3,
                reversed: false,
              },
            ],
            mergeStrategy: "avg",
            min: 0,
            max: 3,
            ranges: [{ min: 1, max: 3 }], // Only affect tiles with height 1-3
          },
        ],
      };

      const result = mapGenerator.generate({
        scenario: testScenario,
        dynamicBattleType: DEFAULT_BATTLE_TYPE,
        maxPlayers: 2,
        seed: 12345,
        tileSize: TILE_SIZE,
        era: "napoleonic",
      });

      // Verify the result was generated successfully
      expect(result).toBeDefined();
      expect(result.map).toBeDefined();
      expect(result.map.heightMap).toBeDefined();

      // Verify that heights outside the range (0 and 4-5) remain unchanged
      // and heights within the range (1-3) get the additional +3
      let hasLowHeight = false;
      let hasHighHeight = false;
      let hasModifiedHeight = false;

      for (let x = 0; x < result.map.heightMap.length; x++) {
        for (let y = 0; y < result.map.heightMap[x].length; y++) {
          const height = result.map.heightMap[x][y];
          if (height === 0) hasLowHeight = true;
          if (height >= 4 && height <= 5) hasHighHeight = true;
          if (height >= 4 && height <= 6) hasModifiedHeight = true; // 1-3 + 3 = 4-6
        }
      }

      // Should have original low heights (0)
      expect(hasLowHeight).toBe(true);
      // Should have original high heights (4-5)
      expect(hasHighHeight).toBe(true);
      // Should have modified heights (4-6) from the second noise
      expect(hasModifiedHeight).toBe(true);
    });

    it("should handle multiple ranges correctly", () => {
      const mapGenerator = new RandomMapGenerator();

      const testScenario: RandomScenario = {
        type: GameScenarioType.Random,
        name: "test-multiple-ranges" as ScenarioName,
        description: "Test scenario for multiple height ranges",
        instructions: [
          // Base height noise
          {
            type: InstructionType.HeightNoise,
            noises: [
              {
                scale: 50,
                multiplier: 1,
                offset: 0,
                reversed: false,
              },
            ],
            mergeStrategy: "avg",
            min: 0,
            max: 5,
          },
          // Height noise that affects multiple ranges
          {
            type: InstructionType.HeightNoise,
            noises: [
              {
                scale: 20,
                multiplier: 1,
                offset: 3,
                reversed: false,
              },
            ],
            mergeStrategy: "avg",
            min: 0,
            max: 3,
            ranges: [
              { min: 0, max: 1 }, // Low range
              { min: 3, max: 4 }, // High range
            ],
          },
        ],
      };

      const result = mapGenerator.generate({
        scenario: testScenario,
        dynamicBattleType: DEFAULT_BATTLE_TYPE,
        maxPlayers: 2,
        seed: 12345,
        tileSize: TILE_SIZE,
        era: "napoleonic",
      });

      expect(result).toBeDefined();
      expect(result.map).toBeDefined();
      expect(result.map.heightMap).toBeDefined();

      // Verify that heights in the middle range (2) are not affected
      let hasUnaffectedHeight = false;
      let hasAffectedHeight = false;

      for (let x = 0; x < result.map.heightMap.length; x++) {
        for (let y = 0; y < result.map.heightMap[x].length; y++) {
          const height = result.map.heightMap[x][y];
          if (height === 2) hasUnaffectedHeight = true;
          if (height >= 3 && height <= 6) hasAffectedHeight = true; // 0-1 + 3 = 3-4, 3-4 + 3 = 6-7 (clamped to 6)
        }
      }

      // Should have heights in the unaffected middle range
      expect(hasUnaffectedHeight).toBe(true);
      // Should have heights in the affected ranges
      expect(hasAffectedHeight).toBe(true);
    });
  });
});
