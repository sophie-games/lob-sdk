import { RandomMapGenerator } from "./random-map-generator";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { GameMap, Size, TerrainType } from "@lob-sdk/types";

// The random maps drawn for the ground of Bonaparte's Italian campaign of 1796-97: a river
// crossed at its bridges and a ford, an alpine valley, a fortified Apennine ridge, a marsh
// crossed on dikes and the Rivoli plateau. Each is checked over every battle size and several seeds, because a template
// that works on one map can wall an army in on another.

const TEMPLATES = [
  "river-crossing",
  "alpine-valley",
  "apennine-ridges",
  "marsh-dikes",
  "rivoli-plateau",
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

  /** The terrain at (x, y), or undefined off the map. */
  terrain(x: number, y: number) {
    return this.map.terrains[x]?.[y];
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
function battle(name: string, size: Size, seed: number, angle?: number): Battle {
  const id = `${name}/${size}/${seed}/${angle ?? 0}`;
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
      ...(angle !== undefined ? { parameters: { angle } } : {}),
    });
    result = new Battle(map, size);
    cache.set(id, result);
  }
  return result;
}

const everyMap = (name: string) =>
  SIZES.flatMap((size) => SEEDS.map((seed) => [size, seed] as const));

const { DeepWater, ShallowWater, Bridge, Road, Building, Forest, LightForest, Redoubt, Cliff, Mud, Farm, FarmGrowing, FarmUnplanted, FortifiedFarm, Grass } = TerrainType;
const CROPS = [Farm, FarmGrowing, FarmUnplanted];

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

  // A campaign battle turns the ground to the angle its river or ridge runs across the armies'
  // line, as far as the template allows; turned either way to that limit it stays playable and fair.
  const accepted = GameDataManager.get("napoleonic").getScenario(name as never).parameters?.angle;
  if (accepted) it.each([accepted.min, accepted.max].flatMap((angle) => SEEDS.slice(0, 2).map((seed) => [angle, seed] as const)))(
    "turned %i degrees, both armies can still deploy, reach each other and meet even ground (seed %i)",
    (angle, seed) => {
      const b = battle(name, Size.Medium, seed, angle);
      for (const team of [1, 2]) {
        const zone = b.mainZone(team);
        expect(zone.filter(([x, y]) => b.passable(x, y)).length / zone.length).toBeGreaterThanOrEqual(0.9);
      }
      expect(b.zonesConnected((x, y) => b.passable(x, y))).toBe(true);
      const blocked = (x: number, y: number) => !b.passable(x, y);
      expect(Math.abs(b.meanHeight(undefined, 0, 100, 0, 50) - b.meanHeight(undefined, 0, 100, 50, 100))).toBeLessThan(0.4);
      expect(Math.abs(b.shareOf(blocked, 0, 100, 0, 50) - b.shareOf(blocked, 0, 100, 50, 100))).toBeLessThan(0.05);
    },
  );

  it.each(everyMap(name))(
    "neither half of the field favours the army deployed on it (%s, seed %i)",
    (size, seed) => {
      const b = battle(name, size, seed);
      const blocked = (x: number, y: number) => !b.passable(x, y);
      const cover = [Forest, LightForest, Building, FortifiedFarm, Redoubt];
      expect(Math.abs(b.meanHeight(undefined, 0, 100, 0, 50) - b.meanHeight(undefined, 0, 100, 50, 100))).toBeLessThan(0.4);
      expect(Math.abs(b.share(cover, 0, 100, 0, 50) - b.share(cover, 0, 100, 50, 100))).toBeLessThan(0.06);
      expect(Math.abs(b.shareOf(blocked, 0, 100, 0, 50) - b.shareOf(blocked, 0, 100, 50, 100))).toBeLessThan(0.05);
    },
  );

  it.each(everyMap(name))("each field is one strip, never several merged into a sprawling patch (%s, seed %i)", (size, seed) => {
    // Each field is one crop; neighbouring fields of another crop are separate fields.
    const b = battle(name, size, seed);
    const seen = new Set<string>();
    let fields = 0;
    for (const [sx, sy] of b.tilesIn()) {
      const crop = b.terrain(sx, sy);
      if (![Farm, FarmGrowing, FarmUnplanted].includes(crop) || seen.has(`${sx},${sy}`)) continue;
      fields++;
      let tiles = 0;
      const stack: Tile[] = [[sx, sy]];
      seen.add(`${sx},${sy}`);
      while (stack.length) {
        const [x, y] = stack.pop()!;
        tiles++;
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Tile[])
          if (nx >= 0 && ny >= 0 && nx < b.tilesX && ny < b.tilesY && b.terrain(nx, ny) === crop && !seen.has(`${nx},${ny}`)) {
            seen.add(`${nx},${ny}`);
            stack.push([nx, ny]);
          }
      }
      // A strip is at most 4 tiles by 12, 200 by 600 m; drawn along a diagonal road it covers up
      // to half as many tiles again.
      expect(tiles).toBeLessThanOrEqual(72);
    }
    expect(fields).toBeGreaterThan(0);
  });
});

// The Po plain of 1796 was farmed along its roads in strips edged with rows of trees and vines
// (the piantata), with meadow between, and walled farmsteads (cascine) off the roads that were
// held as strongpoints.
describe.each(["river-crossing", "marsh-dikes"] as const)("%s is the farmed Po plain", (name) => {
  it.each(everyMap(name))("strip fields, tree rows and walled farmsteads line the roads (%s, seed %i)", (size, seed) => {
    const b = battle(name, size, seed);
    // Measured on the ground either side of the middle, where the river or marsh lies.
    const open = [...b.tilesIn(0, 100, 0, 30), ...b.tilesIn(0, 100, 70, 100)].filter(([x, y]) =>
      [Grass, ...CROPS].includes(b.terrain(x, y)!),
    );
    const farmed = open.filter(([x, y]) => CROPS.includes(b.terrain(x, y)!));
    expect(farmed.length / open.length).toBeGreaterThan(0.15);
    expect(farmed.length / open.length).toBeLessThan(0.5);
    // A tree row is a line of open woodland one tile thick beside a field.
    const rowTiles = [...b.tilesIn(0, 100, 0, 30), ...b.tilesIn(0, 100, 70, 100)].filter(([x, y]) => {
      if (b.terrain(x, y) !== LightForest || !b.near(x, y, 1, CROPS)) return false;
      const across = [b.terrain(x - 1, y) === LightForest, b.terrain(x + 1, y) === LightForest];
      const along = [b.terrain(x, y - 1) === LightForest, b.terrain(x, y + 1) === LightForest];
      return (!across[0] && !across[1] && along.some(Boolean)) || (!along[0] && !along[1] && across.some(Boolean));
    });
    expect(rowTiles.length / open.length).toBeGreaterThan(0.01);
    // The walled farmsteads (cascine) are fortified farms off a road.
    const farmsteads = b.tilesIn().filter(([x, y]) => b.terrain(x, y) === FortifiedFarm);
    expect(farmsteads.length).toBeGreaterThan(0);
    expect(farmsteads.some(([x, y]) => b.near(x, y, 3, [Road]))).toBe(true);
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

  it.each(everyMap("apennine-ridges"))(
    "open chestnut groves on the slopes, with only small fields (%s, seed %i)",
    (size, seed) => {
      // Montenotte and Dego were fought over hills of pasture and chestnut groves, not the farmed
      // Po plain. Groves are light forest, which lines and columns can still cross.
      const b = battle("apennine-ridges", size, seed);
      const slopes = [...b.tilesIn(0, 100, 10, 40), ...b.tilesIn(0, 100, 60, 90)];
      const share = (terrains: TerrainType[]) => slopes.filter(([x, y]) => terrains.includes(b.terrain(x, y)!)).length / slopes.length;
      expect(share([LightForest])).toBeGreaterThan(0.15);
      expect(share([LightForest])).toBeLessThan(0.45);
      expect(share([Forest])).toBeLessThan(0.1);
      expect(share(CROPS)).toBeLessThan(0.15);
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
      expect(b.share([DeepWater], 0, 100, 35, 65)).toBeGreaterThan(0.01);
      // The marsh keeps to the middle: the ground each army deploys on stays mostly dry.
      expect(b.share([Mud, ShallowWater], 0, 100, 0, 20)).toBeLessThan(0.25);
      expect(b.meanHeight(road, 0, 100, 30, 70)).toBeGreaterThan(b.meanHeight(marsh, 0, 100, 30, 70));
      expect(b.zonesConnected((x, y) => b.passable(x, y) && !marsh(x, y) && !road(x, y))).toBe(false);
    },
  );

  it.each(everyMap("marsh-dikes"))(
    "as at Arcole, levees line the stream, crossed at one village-held bridge and a ford downstream (%s, seed %i)",
    (size, seed) => {
      const b = battle("marsh-dikes", size, seed);
      const stream = b.tilesIn().filter(([x, y]) => b.terrain(x, y) === DeepWater);
      // A dike runs along each bank: nearly every stretch of the stream has a road on both sides.
      const leveed = stream.filter(
        ([x, y]) =>
          [Road, Bridge].some((t) => [b.terrain(x, y - 1), b.terrain(x - 1, y - 1), b.terrain(x + 1, y - 1)].includes(t)) &&
          [Road, Bridge].some((t) => [b.terrain(x, y + 1), b.terrain(x - 1, y + 1), b.terrain(x + 1, y + 1)].includes(t)),
      );
      expect(leveed.length / stream.length).toBeGreaterThan(0.6);
      // One bridge, held by a village.
      const bridges = b.tilesIn().filter(([x, y]) => b.terrain(x, y) === Bridge);
      expect(bridges.length).toBeGreaterThan(0);
      for (const [x, y] of bridges)
        for (const [ox, oy] of bridges) expect(Math.max(Math.abs(x - ox), Math.abs(y - oy))).toBeLessThanOrEqual(3);
      expect(bridges.some(([x, y]) => b.near(x, y, 4, [Building]))).toBe(true);
      // The only other way over is a ford a track leads to, well away from the bridge.
      const fords = b.tilesIn().filter(([x, y]) => b.terrain(x, y) === ShallowWater && b.near(x, y, 1, [DeepWater]) && b.near(x, y, 1, [Road]));
      expect(fords.some(([fx, fy]) => bridges.every(([bx, by]) => Math.max(Math.abs(fx - bx), Math.abs(fy - by)) >= 10))).toBe(true);
      const acrossStream = (x: number, y: number) => b.passable(x, y) && b.terrain(x, y) !== Bridge && !fords.some(([fx, fy]) => fx === x && fy === y);
      expect(b.zonesConnected(acrossStream)).toBe(false);
    },
  );
});

describe("rivoli-plateau", () => {
  it.each(everyMap("rivoli-plateau"))(
    "a plateau between Monte Baldo and the Adige gorge, climbed from the gorge by a defile (%s, seed %i)",
    (size, seed) => {
      const b = battle("rivoli-plateau", size, seed);
      const plateau = b.meanHeight(undefined, 35, 65);
      expect(plateau).toBeGreaterThanOrEqual(3.5);
      expect(b.shareOf((x, y) => b.passable(x, y), 35, 65)).toBeGreaterThan(0.95);
      // Monte Baldo rises on one side...
      expect(b.meanHeight(undefined, 0, 15)).toBeGreaterThan(plateau + 1.5);
      // ...and the Adige runs deep at the foot of the gorge's cliffs on the other.
      expect(b.meanHeight(undefined, 88, 100)).toBeLessThan(plateau - 2);
      expect(b.share([DeepWater], 85, 100)).toBeGreaterThan(0.05);
      expect(b.share([DeepWater], 0, 80)).toBe(0);
      expect(b.share([Cliff], 70, 85)).toBeGreaterThan(0.2);
      // The river winds along the gorge floor rather than running ruler-straight.
      const channel = [...Array(b.tilesY).keys()]
        .map((y) => b.tilesIn(80, 100, (y * 100) / b.tilesY, ((y + 1) * 100) / b.tilesY).filter(([x, ty]) => ty === y && b.terrain(x, y) === DeepWater))
        .filter((row) => row.length > 0)
        .map((row) => row.reduce((sum, [x]) => sum + x, 0) / row.length);
      const bends = channel.filter((x, i) => i > 0 && x !== channel[i - 1]).length;
      expect(Math.max(...channel) - Math.min(...channel)).toBeGreaterThanOrEqual(4);
      expect(bends).toBeGreaterThanOrEqual(6);
      // A road climbs out of the gorge onto the plateau, as through the Osteria defile.
      const isRoad = (x: number, y: number) => b.terrain(x, y) === Road || b.terrain(x, y) === Bridge;
      const open: Tile[] = b.tilesIn().filter(([x, y]) => isRoad(x, y) && b.height(x, y) <= 1.5);
      const seen = new Set(open.map(([x, y]) => `${x},${y}`));
      let climbs = false;
      for (let head = 0; head < open.length && !climbs; head++) {
        const [x, y] = open[head];
        if (b.height(x, y) >= 4) climbs = true;
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Tile[])
          if (isRoad(nx, ny) && !seen.has(`${nx},${ny}`)) {
            seen.add(`${nx},${ny}`);
            open.push([nx, ny]);
          }
      }
      expect(climbs).toBe(true);
      // The San Marco chapel crowns a knoll above the gorge.
      expect(b.tilesIn(55, 85).some(([x, y]) => b.terrain(x, y) === Building && b.height(x, y) >= 5.5)).toBe(true);
      expect(b.share([Building], 30, 70)).toBeGreaterThan(0);
    },
  );
});
