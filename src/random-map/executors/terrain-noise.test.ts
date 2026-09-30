import { TerrainNoiseExecutor } from "./terrain-noise";
import { InstructionTerrainNoise, InstructionType, Scenario, TerrainType } from "@lob-sdk/types";
import { SCENARIO_SCHEMA_VERSION } from "@lob-sdk/scenario";

// A range can paint its own terrain, so one noise field draws a wood's dense core and its open
// fringe together: two instructions would each get their own noise and the fringe would not
// follow the core.

const scenario: Scenario = { version: SCENARIO_SCHEMA_VERSION, name: "Noise", description: "", instructions: [] };
const SIZE = 60;

function paint(ranges: InstructionTerrainNoise["ranges"]) {
  const terrains = Array.from({ length: SIZE }, () => Array(SIZE).fill(TerrainType.Grass));
  const heightMap = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  new TerrainNoiseExecutor(
    { type: InstructionType.TerrainNoise, terrain: TerrainType.Forest, scale: 8, ranges },
    scenario,
    42,
    0,
    terrains,
    heightMap,
  ).execute();
  return terrains;
}

describe("TerrainNoiseExecutor range terrains", () => {
  it("paints a range's own terrain from the same noise as the rest", () => {
    const core = { min: 0.8, max: 1 };
    const fringe = { min: 0.7, max: 0.8 };
    const together = paint([core, { ...fringe, terrain: TerrainType.LightForest }]);
    const coreOnly = paint([core]);
    const fringeOnly = paint([fringe]);

    let fringeTiles = 0;
    for (let x = 0; x < SIZE; x++)
      for (let y = 0; y < SIZE; y++) {
        if (coreOnly[x][y] === TerrainType.Forest) expect(together[x][y]).toBe(TerrainType.Forest);
        else if (fringeOnly[x][y] === TerrainType.Forest) {
          expect(together[x][y]).toBe(TerrainType.LightForest);
          fringeTiles++;
        } else expect(together[x][y]).toBe(TerrainType.Grass);
      }
    expect(fringeTiles).toBeGreaterThan(0);
  });
});
