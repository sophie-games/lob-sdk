import { TerrainType } from "@lob-sdk/types";
import { NaturalPathGenerator } from "./natural-path-generator";

const grid = (size: number, value: number) =>
  Array.from({ length: size }, () => Array<number>(size).fill(value));

const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** Whether `to` is reachable from `from` over 8-connected tiles of `terrain`. */
const connected = (terrains: number[][], terrain: number, from: { x: number; y: number }, to: { x: number; y: number }) => {
  const seen = new Set([`${from.x},${from.y}`]);
  const queue = [from];
  while (queue.length) {
    const { x, y } = queue.pop()!;
    if (x === to.x && y === to.y) return true;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (terrains[nx]?.[ny] !== terrain || seen.has(`${nx},${ny}`)) continue;
        seen.add(`${nx},${ny}`);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return false;
};

describe("NaturalPathGenerator", () => {
  it("draws a connected path through every point", () => {
    const terrains = grid(40, TerrainType.Grass);
    const points = [{ x: 3, y: 3 }, { x: 30, y: 12 }, { x: 20, y: 35 }];

    new NaturalPathGenerator(seeded(3), terrains, grid(40, 0), TerrainType.Road).generatePath(points);

    expect(connected(terrains, TerrainType.Road, points[0], points[1])).toBe(true);
    expect(connected(terrains, TerrainType.Road, points[1], points[2])).toBe(true);
  });

  it("settles each tile once, so a search costs no more than the map", () => {
    const size = 48;
    const generator = new NaturalPathGenerator(seeded(5), grid(size, TerrainType.Grass), grid(size, 0), TerrainType.Road);
    const noise = jest.spyOn(generator as unknown as { generateNoise: () => number }, "generateNoise");

    generator.generatePath([{ x: 1, y: 1 }, { x: size - 2, y: size - 2 }]);

    expect(noise.mock.calls.length).toBeLessThanOrEqual(8 * size * size);
  });

  it("draws nothing between points it cannot join", () => {
    const terrains = grid(20, TerrainType.Grass);
    const inside = (x: number) => x < 10;

    new NaturalPathGenerator(
      seeded(7), terrains, grid(20, 0), TerrainType.Road, undefined, 1, undefined, undefined,
      5, 0.1, 1, 6, 1, 2, 1, 1, undefined, false, inside,
    ).generatePath([{ x: 2, y: 2 }, { x: 15, y: 15 }]);

    expect(terrains.flat().includes(TerrainType.Road)).toBe(false);
  });
});
