import { InstructionErosion, InstructionType } from "@lob-sdk/types";
import { randomSeeded } from "@lob-sdk/seed";
import { createNoise2D } from "simplex-noise";
import { ErosionExecutor } from "./erosion";

const MAX_STEP = 4;

/** A mountain flank rising from a valley floor (x = 0) to a crest, rolling as noise makes it. */
function flank(width: number, height: number, seed: number): number[][] {
  const noise = createNoise2D(randomSeeded(seed));
  return Array.from({ length: width }, (_, x) =>
    Array.from({ length: height }, (_, y) =>
      Math.max(2, Math.min(7, Math.floor(2 + (6 * x) / width + 1.2 * noise(x / 9, y / 9)))),
    ),
  );
}

function erode(heightMap: number[][], instruction: Partial<InstructionErosion> = {}) {
  const before = heightMap.map((column) => [...column]);
  new ErosionExecutor({ type: InstructionType.Erosion, ...instruction }, heightMap, MAX_STEP, randomSeeded(7)).execute();
  return before;
}

/** Runs of consecutive tiles in column x that `inValley` accepts. */
function valleysAcross(x: number, height: number, inValley: (x: number, y: number) => boolean): number {
  let runs = 0;
  for (let y = 0; y < height; y++) if (inValley(x, y) && (y === 0 || !inValley(x, y - 1))) runs++;
  return runs;
}

describe("ErosionExecutor", () => {
  it.each([1, 2, 3])("only wears the ground down, in whole levels within the height rule (seed %i)", (seed) => {
    const heights = flank(40, 60, seed);
    const before = erode(heights, { minHeight: 3 });
    for (let x = 0; x < 40; x++)
      for (let y = 0; y < 60; y++) {
        expect(Number.isInteger(heights[x][y])).toBe(true);
        expect(heights[x][y]).toBeLessThanOrEqual(before[x][y]);
        if (before[x][y] < 3) expect(heights[x][y]).toBe(before[x][y]);
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
          const n = heights[x + dx]?.[y + dy];
          if (n !== undefined) expect(Math.abs(n - heights[x][y])).toBeLessThanOrEqual(MAX_STEP);
        }
      }
  });

  it.each([1, 2, 3])(
    "cuts separate valleys down the flank, with ridges standing between them and no hollow left to pool water (seed %i)",
    (seed) => {
      const heights = flank(40, 60, seed);
      const before = erode(heights, { minHeight: 3 });
      const carved = (x: number, y: number) => heights[x][y] <= before[x][y] - 1;
      for (const x of [20, 28, 36]) {
        expect(valleysAcross(x, 60, carved)).toBeGreaterThanOrEqual(3);
        expect(heights[x].some((h, y) => h === before[x][y])).toBe(true);
      }
      const deepest = Math.max(...before.flatMap((column, x) => column.map((h, y) => h - heights[x][y])));
      expect(deepest).toBeGreaterThanOrEqual(2);
      // Every cut tile can drain: some neighbour is no higher than it.
      for (let x = 1; x < 39; x++)
        for (let y = 1; y < 59; y++)
          if (carved(x, y))
            expect([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => heights[x + dx][y + dy] <= heights[x][y])).toBe(true);
    },
  );

  it("leaves flat ground as it is", () => {
    const heights = Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => 5));
    erode(heights, { minHeight: 3 });
    expect(heights.flat().every((h) => h === 5)).toBe(true);
  });
});
