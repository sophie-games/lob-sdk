import { SymmetryExecutor } from "./symmetry";
import { HeightNoiseExecutor } from "./height-noise";
import { TerrainNoiseExecutor } from "./terrain-noise";
import {
  InstructionSymmetry,
  InstructionType,
  Scenario,
  TerrainType,
} from "@lob-sdk/types";
import { SCENARIO_SCHEMA_VERSION } from "@lob-sdk/scenario";
import { TurnedFrame } from "../frame-angle";

// SYMMETRY copies one half of the map onto the other, so two armies deployed on opposite
// halves meet the same ground. `mirror` reflects across the middle, `rotate` turns the kept
// half 180 degrees; `heights` and `terrains` choose what is copied.

const scenario: Scenario = {
  version: SCENARIO_SCHEMA_VERSION,
  name: "Symmetry",
  description: "",
  instructions: [],
};

const W = 50;
const H = 40;

/** Rolling ground with woods and pools: enough irregular content that a copy error shows. */
function irregularMap(seed: number) {
  const terrains = Array.from({ length: W }, () =>
    Array(H).fill(TerrainType.Grass),
  );
  const heightMap = Array.from({ length: W }, () => Array(H).fill(0));
  new HeightNoiseExecutor(
    {
      type: InstructionType.HeightNoise,
      noises: [{ scale: 6, multiplier: 1 }],
      mergeStrategy: "avg",
      min: 0,
      max: 6,
    },
    scenario,
    seed,
    0,
    terrains,
    heightMap,
  ).execute();
  for (const [terrain, min, index] of [
    [TerrainType.Forest, 0.6, 1],
    [TerrainType.DeepWater, 0.8, 2],
  ] as const) {
    new TerrainNoiseExecutor(
      {
        type: InstructionType.TerrainNoise,
        terrain,
        scale: 4,
        ranges: [{ min, max: 1 }],
      },
      scenario,
      seed,
      index,
      terrains,
      heightMap,
    ).execute();
  }
  return { terrains, heightMap };
}

function symmetry(
  instruction: Omit<InstructionSymmetry, "type">,
  seed: number,
) {
  const map = irregularMap(seed);
  new SymmetryExecutor(
    { type: InstructionType.Symmetry, ...instruction },
    map.terrains,
    map.heightMap,
  ).execute();
  return map;
}

/** Largest height step between 8-neighbours; the generator keeps every map at 1 or less. */
function steepestStep(heightMap: number[][]): number {
  let steepest = 0;
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++)
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const h = heightMap[x + dx]?.[y + dy];
          if (h !== undefined)
            steepest = Math.max(steepest, Math.abs(heightMap[x][y] - h));
        }
  return steepest;
}

describe("SymmetryExecutor", () => {
  it.each([1, 42, 777])(
    "rotate: every tile matches the tile opposite it through the centre (seed %i)",
    (seed) => {
      const { terrains, heightMap } = symmetry(
        { mode: "rotate", keep: "left" },
        seed,
      );
      for (let x = 0; x < W; x++)
        for (let y = 0; y < H; y++) {
          expect(terrains[x][y]).toBe(terrains[W - 1 - x][H - 1 - y]);
          expect(heightMap[x][y]).toBe(heightMap[W - 1 - x][H - 1 - y]);
        }
      // The seam where the halves meet keeps the one-level-per-tile slope limit.
      expect(steepestStep(heightMap)).toBeLessThanOrEqual(1);
    },
  );

  it("mirror: the bottom half reflects the top", () => {
    const { terrains, heightMap } = symmetry({ mode: "mirror", keep: "top" }, 42);
    for (let x = 0; x < W; x++)
      for (let y = 0; y < H; y++) {
        expect(terrains[x][y]).toBe(terrains[x][H - 1 - y]);
        expect(heightMap[x][y]).toBe(heightMap[x][H - 1 - y]);
      }
    expect(steepestStep(heightMap)).toBeLessThanOrEqual(1);
  });

  it("terrains: only the listed terrains are made symmetric, and heights: false keeps the relief", () => {
    const untouched = irregularMap(42);
    const { terrains, heightMap } = symmetry(
      {
        mode: "rotate",
        keep: "left",
        heights: false,
        terrains: [TerrainType.DeepWater],
      },
      42,
    );
    let unmatchedWoods = 0;
    for (let x = 0; x < W; x++)
      for (let y = 0; y < H; y++) {
        const mine = terrains[x][y];
        const opposite = terrains[W - 1 - x][H - 1 - y];
        expect(mine === TerrainType.DeepWater).toBe(
          opposite === TerrainType.DeepWater,
        );
        if (mine === TerrainType.Forest && opposite !== TerrainType.Forest)
          unmatchedWoods++;
      }
    expect(unmatchedWoods).toBeGreaterThan(0);
    expect(heightMap).toEqual(untouched.heightMap);
  });

  it.each(["rotate", "mirror"] as const)(
    "%s on a turned map with bounds: the area's bottom half copies its top, nothing else changes",
    (mode) => {
      const untouched = irregularMap(42);
      const { terrains, heightMap } = irregularMap(42);
      // The left half of a frame turned 20 degrees.
      const area = new TurnedFrame(20, W, H).area({ min: 0, max: 50 }, { min: 0, max: 100 });
      new SymmetryExecutor(
        { type: InstructionType.Symmetry, mode, keep: "top", heights: false },
        terrains,
        heightMap,
        area,
      ).execute();
      let copied = 0;
      for (let x = 0; x < W; x++)
        for (let y = 0; y < H; y++) {
          const [u, v] = area.local(x, y);
          if (!area.contains(x, y) || v <= (area.tilesY - 1) / 2) {
            expect(terrains[x][y]).toBe(untouched.terrains[x][y]);
            continue;
          }
          // The source is this tile's image in the area's own middle, from the kept top half.
          const [mx, my] = area.toMap(
            mode === "rotate" ? area.tilesX - 1 - u : u,
            area.tilesY - 1 - v,
          );
          const ix = Math.min(W - 1, Math.max(0, Math.round(mx)));
          const iy = Math.min(H - 1, Math.max(0, Math.round(my)));
          expect(terrains[x][y]).toBe(untouched.terrains[ix][iy]);
          copied++;
        }
      expect(copied).toBeGreaterThan(0);
    },
  );
});
