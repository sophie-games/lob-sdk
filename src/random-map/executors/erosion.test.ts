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

/** Valleys crossing column x: runs of carved floor with higher ground on both sides. */
function valleysAcross(heights: number[][], x: number, carved: (x: number, y: number) => boolean): number {
  const column = heights[x];
  let valleys = 0;
  for (let start = 0, end = 0; start < column.length; start = end + 1) {
    let floorCarved = carved(x, start);
    for (end = start; end + 1 < column.length && column[end + 1] === column[start]; end++)
      floorCarved &&= carved(x, end + 1);
    if (floorCarved && column[start - 1] > column[start] && column[end + 1] > column[start]) valleys++;
  }
  return valleys;
}

/** Whether water on tile (x, y) runs off the map's edge without ever climbing. */
function drains(heights: number[][], x: number, y: number): boolean {
  const width = heights.length;
  const height = heights[0].length;
  const seen = new Set([x * height + y]);
  const queue = [[x, y]];
  for (const [cx, cy] of queue) {
    if (cx === 0 || cy === 0 || cx === width - 1 || cy === height - 1) return true;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const [nx, ny] = [cx + dx, cy + dy];
        if (heights[nx][ny] <= heights[cx][cy] && !seen.has(nx * height + ny)) {
          seen.add(nx * height + ny);
          queue.push([nx, ny]);
        }
      }
  }
  return false;
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
      for (const x of [20, 28]) expect(valleysAcross(heights, x, carved)).toBeGreaterThanOrEqual(3);
      const deepest = Math.max(...before.flatMap((column, x) => column.map((h, y) => h - heights[x][y])));
      expect(deepest).toBeGreaterThanOrEqual(2);
      for (let x = 0; x < 40; x++)
        for (let y = 0; y < 60; y++) if (carved(x, y)) expect(drains(heights, x, y)).toBe(true);
    },
  );

  it.each([1, 2, 3])(
    "carves whole valleys, not chains of pits at each terrace edge, between rounded ridges (seed %i)",
    (seed) => {
      const heights = flank(40, 60, seed);
      const before = erode(heights, { minHeight: 3 });
      const carved = (x: number, y: number) => heights[x][y] <= before[x][y] - 1;
      for (let x = 1; x < 39; x++)
        for (let y = 1; y < 59; y++) {
          const sides = [heights[x - 1][y], heights[x + 1][y], heights[x][y - 1], heights[x][y + 1]];
          // No cut tile sunk below all four sides, a pit only draining corner to corner.
          if (carved(x, y)) expect(sides.some((h) => h <= heights[x][y])).toBe(true);
          // No uncut ground left standing one tile wide between two cuts.
          else
            for (const [dx, dy] of [[1, 0], [0, 1]])
              expect(
                carved(x - dx, y - dy) &&
                  carved(x + dx, y + dy) &&
                  heights[x - dx][y - dy] < heights[x][y] &&
                  heights[x + dx][y + dy] < heights[x][y],
              ).toBe(false);
        }
    },
  );

  it("leaves flat ground as it is", () => {
    const heights = Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => 5));
    erode(heights, { minHeight: 3 });
    expect(heights.flat().every((h) => h === 5)).toBe(true);
  });
});
