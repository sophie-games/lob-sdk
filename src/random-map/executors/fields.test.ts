import { FieldsExecutor } from "./fields";
import { InstructionFields, InstructionType, TerrainType } from "@lob-sdk/types";

// FIELDS cuts the grass beside a road into strips that run parallel to it, as farmland grows
// along the roads that serve it, and sows each strip with one crop or leaves it meadow.

const SIZE = 60;
const ROAD_Y = 30;
const { Grass, Road, Farm, FarmGrowing, FarmUnplanted, Forest, LightForest, DeepWater } = TerrainType;
const CROPS = [Farm, FarmGrowing, FarmUnplanted];

type Tile = [number, number];

function map(road: (x: number, y: number) => boolean) {
  const terrains: TerrainType[][] = Array.from({ length: SIZE }, (_, x) =>
    Array.from({ length: SIZE }, (_, y) => (road(x, y) ? Road : Grass)),
  );
  const heightMap = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  return { terrains, heightMap };
}

function sow(
  terrains: TerrainType[][],
  heightMap: number[][],
  seed: number,
  extra: Partial<InstructionFields> = {},
) {
  new FieldsExecutor(
    {
      type: InstructionType.Fields,
      terrains: CROPS,
      maxDistance: 12,
      width: { min: 3, max: 4 },
      size: { min: 6, max: 10 },
      chance: 0.8,
      ...extra,
    },
    seed,
    0,
    terrains,
    heightMap,
  ).execute();
}

/** Each 4-connected patch of one crop: a field, since neighbouring strips never share a crop. */
function fields(terrains: TerrainType[][]): Tile[][] {
  const seen = new Set<string>();
  const out: Tile[][] = [];
  for (let x = 0; x < SIZE; x++)
    for (let y = 0; y < SIZE; y++) {
      const crop = terrains[x][y];
      if (!CROPS.includes(crop) || seen.has(`${x},${y}`)) continue;
      const patch: Tile[] = [];
      const stack: Tile[] = [[x, y]];
      seen.add(`${x},${y}`);
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        patch.push([cx, cy]);
        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]] as Tile[])
          if (terrains[nx]?.[ny] === crop && !seen.has(`${nx},${ny}`)) {
            seen.add(`${nx},${ny}`);
            stack.push([nx, ny]);
          }
      }
      out.push(patch);
    }
  return out;
}

const spread = (patch: Tile[], project: (t: Tile) => number) => {
  const values = patch.map(project);
  return Math.max(...values) - Math.min(...values) + 1;
};

describe("FieldsExecutor", () => {
  it.each([1, 42, 777])("sows strips that run along a straight road (seed %i)", (seed) => {
    const { terrains, heightMap } = map((_, y) => y === ROAD_Y);
    sow(terrains, heightMap, seed);

    const sown: Tile[] = [];
    for (let x = 0; x < SIZE; x++)
      for (let y = 0; y < SIZE; y++) if (CROPS.includes(terrains[x][y])) sown.push([x, y]);
    // A grass verge along the road, and nothing sown past the fields' reach.
    for (const [, y] of sown) {
      expect(Math.abs(y - ROAD_Y)).toBeGreaterThan(1);
      expect(Math.abs(y - ROAD_Y)).toBeLessThanOrEqual(12);
    }
    // Most strips are sown, some left meadow.
    const reach = SIZE * 2 * 11;
    expect(sown.length / reach).toBeGreaterThan(0.55);
    expect(sown.length / reach).toBeLessThan(0.97);
    // Every field is a strip along the road: long, and no wider than a strip.
    const all = fields(terrains);
    expect(all.length).toBeGreaterThan(10);
    for (const field of all) {
      expect(spread(field, ([, y]) => y)).toBeLessThanOrEqual(4);
      expect(spread(field, ([x]) => x)).toBeLessThanOrEqual(10);
    }
    // Fields the map edge cuts short are left out. No sliver is sown on its own.
    const whole = all.filter((f) => f.every(([x]) => x > 0 && x < SIZE - 1));
    for (const field of whole) expect(field.length).toBeGreaterThanOrEqual(9);
    expect(whole.filter((f) => spread(f, ([x]) => x) > spread(f, ([, y]) => y)).length / whole.length).toBeGreaterThan(0.8);
  });

  it("turns its strips to follow a diagonal road", () => {
    const { terrains, heightMap } = map((x, y) => x === y || x === y + 1);
    sow(terrains, heightMap, 42);
    const all = fields(terrains).filter((f) => f.length >= 6);
    expect(all.length).toBeGreaterThan(5);
    const along = all.filter((f) => spread(f, ([x, y]) => x + y) > spread(f, ([x, y]) => x - y));
    expect(along.length / all.length).toBeGreaterThan(0.8);
  });

  it("sows only grass", () => {
    const { terrains, heightMap } = map((_, y) => y === ROAD_Y);
    for (let x = 10; x < 20; x++) for (let y = 33; y < 38; y++) terrains[x][y] = Forest;
    terrains[40][35] = DeepWater;
    sow(terrains, heightMap, 42, { chance: 1 });
    for (let x = 10; x < 20; x++) for (let y = 33; y < 38; y++) expect(terrains[x][y]).toBe(Forest);
    expect(terrains[40][35]).toBe(DeepWater);
  });

  it("draws its border rows between strips, parallel to the road", () => {
    const { terrains, heightMap } = map((_, y) => y === ROAD_Y);
    sow(terrains, heightMap, 42, { border: { terrain: LightForest, chance: 1 } });
    const rows: Tile[] = [];
    for (let x = 0; x < SIZE; x++) for (let y = 0; y < SIZE; y++) if (terrains[x][y] === LightForest) rows.push([x, y]);
    expect(rows.length).toBeGreaterThan(SIZE);
    // A row is one tile thick: no row tile has another straight above or below it.
    for (const [x, y] of rows) {
      expect(terrains[x][y - 1]).not.toBe(LightForest);
      expect(terrains[x][y + 1]).not.toBe(LightForest);
    }
  });

  it("sows only within its height ranges", () => {
    const { terrains, heightMap } = map((_, y) => y === ROAD_Y);
    for (let x = 0; x < SIZE; x++) for (let y = 0; y < ROAD_Y; y++) heightMap[x][y] = 3;
    sow(terrains, heightMap, 42, { heights: [{ min: -1, max: 1 }] });
    for (let x = 0; x < SIZE; x++) for (let y = 0; y < ROAD_Y; y++) expect(CROPS).not.toContain(terrains[x][y]);
    expect(fields(terrains).length).toBeGreaterThan(0);
  });

  it("leaves the verge its instruction asks for", () => {
    const { terrains, heightMap } = map((_, y) => y === ROAD_Y);
    sow(terrains, heightMap, 42, { verge: 3, chance: 1 });
    for (let x = 0; x < SIZE; x++)
      for (let y = 0; y < SIZE; y++)
        if (CROPS.includes(terrains[x][y])) expect(Math.abs(y - ROAD_Y)).toBeGreaterThan(3);
    expect(fields(terrains).length).toBeGreaterThan(0);
  });

  it("leaves meadow any parcel smaller than its minimum field", () => {
    const { terrains, heightMap } = map((_, y) => y === ROAD_Y);
    // No strip can reach 1000 tiles, so nothing is sown.
    sow(terrains, heightMap, 42, { chance: 1, minTiles: 1000 });
    expect(fields(terrains)).toHaveLength(0);
  });

  it("rounds strip directions to its direction step", () => {
    // A diagonal road with strips held to right angles: every field runs along an axis.
    const { terrains, heightMap } = map((x, y) => x === y || x === y + 1);
    sow(terrains, heightMap, 42, { directionStep: 90 });
    const all = fields(terrains).filter((f) => f.length >= 6);
    expect(all.length).toBeGreaterThan(5);
    // An upright block spans as much along x + y as along x and y together; a diagonal strip less.
    const upright = all.filter((f) => spread(f, ([x, y]) => x + y) >= spread(f, ([x]) => x) + spread(f, ([, y]) => y) - 2);
    expect(upright.length / all.length).toBeGreaterThan(0.7);
  });
});
