import { RandomMapGenerator } from "./random-map-generator";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { GameMap, Size, TerrainType } from "@lob-sdk/types";

// The random maps drawn for the ground of Bonaparte's Italian campaign of 1796-97: a river
// crossed at its bridges and a ford, an alpine valley, a fortified Apennine ridge and a marsh
// crossed on dikes. Each is checked over every battle size and several seeds, because a template
// that works on one map can wall an army in on another.

const TEMPLATES = [
  "river-crossing",
  "alpine-valley",
  "apennine-ridges",
  "marsh-dikes",
] as const;
const SIZES = [Size.Small, Size.Medium, Size.Large, Size.ExtraLarge];
const SEEDS = [1, 42, 12345, 777, 2024];

const gdm = GameDataManager.get("napoleonic");
const { TILE_SIZE } = gdm.getGameConstants();
const generator = new RandomMapGenerator();

type Tile = [number, number];

/** A generated battle map with the questions the checks ask of it. */
class Battle {
  readonly tilesX: number;
  readonly tilesY: number;

  constructor(
    readonly map: GameMap,
    private readonly size: Size,
  ) {
    this.tilesX = map.terrains.length;
    this.tilesY = map.terrains[0].length;
  }

  terrain(x: number, y: number) {
    return this.map.terrains[x][y];
  }

  height(x: number, y: number) {
    return this.map.heightMap[x][y];
  }

  passable(x: number, y: number) {
    return gdm.isPassable(this.terrain(x, y), "infantry");
  }

  /**
   * Tiles of a team's main deployment zone: the template's own zones when it declares them,
   * else the battle size's grid (team 1 at the bottom, team 2 at the top).
   */
  mainZone(team: number): Tile[] {
    const tiles: Tile[] = [];
    const zones = this.map.deploymentZones
      ?.find((z) => z.team === team)
      ?.zones.filter((z) => z.type === "main");
    if (zones && zones.length > 0) {
      for (const zone of zones)
        for (const polygon of zone.polygons) {
          const xs = polygon.outer.map((p) => p.x / TILE_SIZE);
          const ys = polygon.outer.map((p) => p.y / TILE_SIZE);
          for (let x = Math.floor(Math.min(...xs)); x < Math.max(...xs); x++)
            for (let y = Math.floor(Math.min(...ys)); y < Math.max(...ys); y++)
              if (x >= 0 && y >= 0 && x < this.tilesX && y < this.tilesY)
                tiles.push([x, y]);
        }
      return tiles;
    }
    const { tilesX: zoneW, tilesY: zoneH, zoneSeparation } =
      gdm.getMapSizes()[this.size].mainDeployment;
    const x0 = Math.floor((this.tilesX - zoneW) / 2);
    const innerEdge = Math.floor(this.tilesY / 2 - zoneSeparation / 2);
    for (let x = x0; x < x0 + zoneW; x++)
      for (let d = 0; d < zoneH; d++)
        tiles.push([x, team === 2 ? innerEdge - 1 - d : this.tilesY - innerEdge + d]);
    return tiles;
  }

  /** Whether team 1's main zone reaches team 2's over tiles `walkable` accepts. */
  zonesConnected(walkable: (x: number, y: number) => boolean): boolean {
    const seen = new Set<number>();
    const key = (x: number, y: number) => x * 10000 + y;
    const goal = new Set(this.mainZone(2).map(([x, y]) => key(x, y)));
    const open: Tile[] = this.mainZone(1).filter(([x, y]) => walkable(x, y));
    open.forEach(([x, y]) => seen.add(key(x, y)));
    for (let head = 0; head < open.length; head++) {
      const [x, y] = open[head];
      if (goal.has(key(x, y))) return true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.tilesX || ny >= this.tilesY) continue;
        if (seen.has(key(nx, ny)) || !walkable(nx, ny)) continue;
        seen.add(key(nx, ny));
        open.push([nx, ny]);
      }
    }
    return false;
  }

  /** Tiles of the rectangle given in percent of the map on each axis. */
  tilesIn(x0 = 0, x1 = 100, y0 = 0, y1 = 100): Tile[] {
    const tiles: Tile[] = [];
    for (let x = Math.floor((x0 / 100) * this.tilesX); x < Math.floor((x1 / 100) * this.tilesX); x++)
      for (let y = Math.floor((y0 / 100) * this.tilesY); y < Math.floor((y1 / 100) * this.tilesY); y++)
        tiles.push([x, y]);
    return tiles;
  }

  /** Share of the rectangle's tiles whose terrain is listed. */
  share(terrains: TerrainType[], x0 = 0, x1 = 100, y0 = 0, y1 = 100): number {
    const tiles = this.tilesIn(x0, x1, y0, y1);
    return tiles.filter(([x, y]) => terrains.includes(this.terrain(x, y))).length / tiles.length;
  }

  /** Share of the rectangle's tiles `accept` takes. */
  shareOf(accept: (x: number, y: number) => boolean, x0 = 0, x1 = 100, y0 = 0, y1 = 100): number {
    const tiles = this.tilesIn(x0, x1, y0, y1);
    return tiles.filter(([x, y]) => accept(x, y)).length / tiles.length;
  }

  /** Mean height of the rectangle's tiles `accept` takes. */
  meanHeight(accept: (x: number, y: number) => boolean = () => true, x0 = 0, x1 = 100, y0 = 0, y1 = 100): number {
    const tiles = this.tilesIn(x0, x1, y0, y1).filter(([x, y]) => accept(x, y));
    return tiles.reduce((sum, [x, y]) => sum + this.height(x, y), 0) / Math.max(1, tiles.length);
  }

  /** Whether a listed terrain lies within `radius` tiles (Chebyshev) of (x, y). */
  near(x: number, y: number, radius: number, terrains: TerrainType[]): boolean {
    for (let nx = x - radius; nx <= x + radius; nx++)
      for (let ny = y - radius; ny <= y + radius; ny++) {
        const t = this.map.terrains[nx]?.[ny];
        if (t !== undefined && terrains.includes(t)) return true;
      }
    return false;
  }

  heightSpan(): number {
    const all = this.map.heightMap.flat();
    return Math.max(...all) - Math.min(...all);
  }
}

const cache = new Map<string, Battle>();
function battle(name: string, size: Size, seed: number): Battle {
  const id = `${name}/${size}/${seed}`;
  let result = cache.get(id);
  if (!result) {
    const { map } = generator.generate({
      scenario: gdm.getScenario(name as never),
      dynamicBattleType: null,
      maxPlayers: 2,
      seed,
      tileSize: TILE_SIZE,
      era: "napoleonic",
      mapSize: size,
    });
    result = new Battle(map, size);
    cache.set(id, result);
  }
  return result;
}

const everyMap = (name: string) =>
  SIZES.flatMap((size) => SEEDS.map((seed) => [size, seed] as const));

const { DeepWater, ShallowWater, Bridge, Road, Building, Forest, Redoubt, Cliff, Mud, Farm, FarmGrowing, FarmUnplanted } = TerrainType;

describe.each(TEMPLATES)("%s", (name) => {
  it.each(everyMap(name))("both armies can deploy and reach each other (%s, seed %i)", (size, seed) => {
    const b = battle(name, size, seed);
    for (const team of [1, 2]) {
      const zone = b.mainZone(team);
      expect(zone.length).toBeGreaterThan(0);
      expect(zone.filter(([x, y]) => b.passable(x, y)).length / zone.length).toBeGreaterThanOrEqual(0.9);
    }
    expect(b.zonesConnected((x, y) => b.passable(x, y))).toBe(true);
  });

  it.each(everyMap(name))(
    "neither half of the field favours the army deployed on it (%s, seed %i)",
    (size, seed) => {
      const b = battle(name, size, seed);
      const blocked = (x: number, y: number) => !b.passable(x, y);
      const cover = [Forest, Building, Redoubt];
      expect(Math.abs(b.meanHeight(undefined, 0, 100, 0, 50) - b.meanHeight(undefined, 0, 100, 50, 100))).toBeLessThan(0.4);
      expect(Math.abs(b.share(cover, 0, 100, 0, 50) - b.share(cover, 0, 100, 50, 100))).toBeLessThan(0.06);
      expect(Math.abs(b.shareOf(blocked, 0, 100, 0, 50) - b.shareOf(blocked, 0, 100, 50, 100))).toBeLessThan(0.05);
    },
  );

  it.each(everyMap(name))("fields are compact blocks, never stretched into long strips (%s, seed %i)", (size, seed) => {
    // Each field is one crop; neighbouring fields of another crop are separate fields.
    const b = battle(name, size, seed);
    const seen = new Set<string>();
    let fields = 0;
    for (const [sx, sy] of b.tilesIn()) {
      const crop = b.terrain(sx, sy);
      if (![Farm, FarmGrowing, FarmUnplanted].includes(crop) || seen.has(`${sx},${sy}`)) continue;
      fields++;
      let [x0, y0, x1, y1] = [sx, sy, sx, sy];
      const stack: Tile[] = [[sx, sy]];
      seen.add(`${sx},${sy}`);
      while (stack.length) {
        const [x, y] = stack.pop()!;
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Tile[])
          if (nx >= 0 && ny >= 0 && nx < b.tilesX && ny < b.tilesY && b.terrain(nx, ny) === crop && !seen.has(`${nx},${ny}`)) {
            seen.add(`${nx},${ny}`);
            stack.push([nx, ny]);
          }
      }
      // A field is at most 400-450 m on a side.
      expect(Math.max(x1 - x0, y1 - y0) + 1).toBeLessThanOrEqual(9);
    }
    expect(fields).toBeGreaterThan(0);
  });
});

describe("river-crossing", () => {
  it.each(everyMap("river-crossing"))(
    "a deep river between the armies is crossed only at bridges and a ford a track leads to, with a village at a bridge (%s, seed %i)",
    (size, seed) => {
      const b = battle("river-crossing", size, seed);
      // With every crossing closed the armies are cut off from each other.
      expect(
        b.zonesConnected((x, y) => b.passable(x, y) && b.terrain(x, y) !== Bridge && b.terrain(x, y) !== ShallowWater),
      ).toBe(false);
      expect(b.share([DeepWater], 0, 100, 30, 70)).toBeGreaterThan(0.04);
      expect(b.share([DeepWater], 0, 100, 0, 25)).toBe(0);
      let villageAtBridge = false;
      for (const [x, y] of b.tilesIn()) {
        if (b.terrain(x, y) === ShallowWater && b.near(x, y, 1, [DeepWater]))
          expect(b.near(x, y, 3, [Road])).toBe(true);
        if (b.terrain(x, y) === Bridge && b.near(x, y, 4, [Building])) villageAtBridge = true;
      }
      expect(villageAtBridge).toBe(true);
      // As at Lodi, Borghetto and Gradisca: one bridge carries the road, and the way round it is a
      // ford at least 500 m (10 tiles) off.
      const bridges = b.tilesIn().filter(([x, y]) => b.terrain(x, y) === Bridge);
      const fords = b.tilesIn().filter(([x, y]) => b.terrain(x, y) === ShallowWater && b.near(x, y, 1, [DeepWater]));
      expect(bridges.length).toBeGreaterThan(0);
      expect(fords.length).toBeGreaterThan(0);
      expect(fords.some(([fx, fy]) => bridges.every(([bx, by]) => Math.max(Math.abs(fx - bx), Math.abs(fy - by)) >= 10))).toBe(true);
    },
  );
});

describe("alpine-valley", () => {
  it.each(everyMap("alpine-valley"))(
    "cliffs wall a valley that runs between the armies and closes to a narrows halfway (%s, seed %i)",
    (size, seed) => {
      const b = battle("alpine-valley", size, seed);
      expect(b.share([Cliff], 0, 30)).toBeGreaterThan(0.15);
      expect(b.share([Cliff], 70, 100)).toBeGreaterThan(0.15);
      expect(b.share([Cliff, DeepWater], 35, 65)).toBeLessThan(0.1);
      expect(b.heightSpan()).toBeGreaterThanOrEqual(4);
      // Somewhere halfway down, spurs from the walls close the valley floor to a narrows.
      const floor = (x: number, y: number) => b.passable(x, y) && b.height(x, y) <= 3;
      let narrowest = 1;
      for (let y = Math.floor(0.35 * b.tilesY); y < Math.floor(0.65 * b.tilesY); y++) {
        let open = 0;
        for (let x = 0; x < b.tilesX; x++) if (floor(x, y)) open++;
        narrowest = Math.min(narrowest, open / b.tilesX);
      }
      expect(narrowest).toBeLessThan(0.7 * b.shareOf(floor, 0, 100, 20, 30));
    },
  );
});

describe("apennine-ridges", () => {
  it.each(everyMap("apennine-ridges"))(
    "a ridge crowned with redoubts rises well clear of the ground either side (%s, seed %i)",
    (size, seed) => {
      const b = battle("apennine-ridges", size, seed);
      const ridge = b.meanHeight(undefined, 0, 100, 35, 65);
      const flanks = (b.meanHeight(undefined, 0, 100, 0, 20) + b.meanHeight(undefined, 0, 100, 80, 100)) / 2;
      expect(ridge).toBeGreaterThan(flanks + 2.5);
      expect(b.share([Redoubt], 0, 100, 30, 70)).toBeGreaterThan(0);
      for (const [x, y] of b.tilesIn()) if (b.terrain(x, y) === Redoubt) expect(b.height(x, y)).toBeGreaterThanOrEqual(5);
    },
  );
});

describe("marsh-dikes", () => {
  it.each(everyMap("marsh-dikes"))(
    "the marsh between the armies is crossed only on raised dikes (%s, seed %i)",
    (size, seed) => {
      const b = battle("marsh-dikes", size, seed);
      const road = (x: number, y: number) => b.terrain(x, y) === Road || b.terrain(x, y) === Bridge;
      const marsh = (x: number, y: number) => b.terrain(x, y) === Mud || b.terrain(x, y) === ShallowWater;
      expect(b.share([Mud, ShallowWater], 0, 100, 30, 70)).toBeGreaterThan(0.3);
      // A deep channel runs through the marsh, bridged where the dikes cross it.
      expect(b.share([DeepWater], 0, 100, 35, 65)).toBeGreaterThan(0.01);
      // Each dike bridges the channel on its own line, so no single bridge decides the battle.
      const bridgeColumns = new Set(b.tilesIn().filter(([x, y]) => b.terrain(x, y) === Bridge).map(([x]) => Math.floor(x / 10)));
      expect(bridgeColumns.size).toBeGreaterThanOrEqual(2);
      // The marsh keeps to the middle: the ground each army deploys on stays mostly dry.
      expect(b.share([Mud, ShallowWater], 0, 100, 0, 20)).toBeLessThan(0.25);
      expect(b.meanHeight(road, 0, 100, 30, 70)).toBeGreaterThan(b.meanHeight(marsh, 0, 100, 30, 70));
      expect(b.zonesConnected((x, y) => b.passable(x, y) && !marsh(x, y) && !road(x, y))).toBe(false);
    },
  );
});
