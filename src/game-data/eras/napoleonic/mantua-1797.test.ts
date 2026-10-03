import { GameDataManager } from "@lob-sdk/game-data-manager";
import { normalizeScenario } from "@lob-sdk/scenario";
import type { RawScenarioInput } from "@lob-sdk/scenario";
import { ObjectiveType } from "@lob-sdk/types/objective";
import { TerrainType } from "@lob-sdk/types/terrain";
import { napoleonicScenarioCatalog } from "./scenario-catalog";

const TILE = 16;
const FRENCH = 1;
const GARRISON = 2;
const RELIEF = 3;
const RESERVE = 4;

const scenario = normalizeScenario(
  (napoleonicScenarioCatalog as unknown as Record<string, RawScenarioInput>)[
    "mantua-1797"
  ]!,
);
const map = scenario.map!;
const terrains = map.terrains;
const manager = GameDataManager.get("napoleonic");

const tileOf = ({ x, y }: { x: number; y: number }) => ({
  tx: Math.floor(x / TILE),
  ty: Math.floor(y / TILE),
});

/** A causeway, or a road running through a gap in the ramparts. */
const isGateOrCauseway = (tx: number, ty: number) => {
  const terrain = terrains[tx]![ty]!;
  if (terrain === TerrainType.Bridge) return true;
  if (terrain !== TerrainType.Road) return false;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (terrains[tx + dx]?.[ty + dy] === TerrainType.Rampart) return true;
    }
  }
  return false;
};

/** Whether a unit can walk between two points over `open` tiles. */
const reaches = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  open: (terrain: TerrainType, tx: number, ty: number) => boolean,
) => {
  const start = tileOf(from);
  const goal = tileOf(to);
  const size = terrains.length;
  const seen = new Set([`${start.tx},${start.ty}`]);
  const queue = [start];
  while (queue.length) {
    const { tx, ty } = queue.shift()!;
    if (tx === goal.tx && ty === goal.ty) return true;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = tx + dx;
      const ny = ty + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size || seen.has(key)) continue;
      // The objectives stand on roads, so the goal itself is always open.
      if (nx === goal.tx && ny === goal.ty) return true;
      if (!open(terrains[nx]![ny]!, nx, ny)) continue;
      seen.add(key);
      queue.push({ tx: nx, ty: ny });
    }
  }
  return false;
};

const heights = map.heightMap!;
const WATER = [TerrainType.ShallowWater, TerrainType.DeepWater];

/** 4-connected bodies of open water; a bridge splits them. */
const waterBodies = () => {
  const seen = new Set<string>();
  const bodies: [number, number][][] = [];
  terrains.forEach((column, x) =>
    column.forEach((terrain, y) => {
      if (!WATER.includes(terrain) || seen.has(`${x},${y}`)) return;
      const body: [number, number][] = [[x, y]];
      seen.add(`${x},${y}`);
      for (let i = 0; i < body.length; i++) {
        const [bx, by] = body[i]!;
        for (const [nx, ny] of [
          [bx + 1, by],
          [bx - 1, by],
          [bx, by + 1],
          [bx, by - 1],
        ] as [number, number][]) {
          const t = terrains[nx]?.[ny];
          if (t !== undefined && WATER.includes(t) && !seen.has(`${nx},${ny}`)) {
            seen.add(`${nx},${ny}`);
            body.push([nx, ny]);
          }
        }
      }
      bodies.push(body);
    }),
  );
  return bodies;
};

const objectivesOf = (team: number) =>
  scenario.objectives!.filter((objective) => objective.team === team);

const mainZoneOf = (player: number) =>
  map
    .deploymentZones!.flatMap(({ zones }) => zones)
    .find((zone) => zone.player === player && zone.type === "main");

/** The mean of a seat's main zone corners. */
const centreOf = (player: number) => {
  const corners = mainZoneOf(player)!.polygons.flatMap(({ outer }) => outer);
  return {
    x: corners.reduce((sum, p) => sum + p.x, 0) / corners.length,
    y: corners.reduce((sum, p) => sum + p.y, 0) / corners.length,
  };
};

describe("Mantua 1797", () => {
  it("seats the French blockade and reserve against the garrison and a relief column", () => {
    expect(scenario.allowDynamicArmy).toBe(true);
    expect(scenario.players).toEqual([
      { player: FRENCH, team: 1 },
      { player: GARRISON, team: 2 },
      { player: RELIEF, team: 2 },
      { player: RESERVE, team: 1 },
    ]);
    for (const player of [FRENCH, GARRISON, RELIEF, RESERVE]) {
      expect(mainZoneOf(player)).toBeDefined();
    }
  });

  it("brings the relief from the east and the French reserve from the north, as on 16 January", () => {
    const garrison = centreOf(GARRISON);
    const relief = centreOf(RELIEF);
    const reserve = centreOf(RESERVE);
    const blockade = centreOf(FRENCH);

    expect(relief.x - garrison.x).toBeGreaterThan(80 * TILE);
    expect(garrison.y - reserve.y).toBeGreaterThan(80 * TILE);
    // The blockade stands between the reserve and the fortress.
    expect(blockade.y).toBeGreaterThan(reserve.y);
    expect(blockade.y).toBeLessThan(garrison.y);
  });

  it("faces every army toward its enemy: the French on the fortress, the relief on the blockade", () => {
    // A zone's rotation is the generated army's facing in radians, clockwise
    // from east with y growing south, so 270 degrees faces up the map.
    const bearing = (
      from: { x: number; y: number },
      to: { x: number; y: number },
    ) => Math.atan2(to.y - from.y, to.x - from.x);
    const apart = (a: number, b: number) =>
      Math.abs((((a - b) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    const fortress = centreOf(GARRISON);
    const blockade = centreOf(FRENCH);
    const targets: Record<number, { x: number; y: number }> = {
      [FRENCH]: fortress,
      [RESERVE]: fortress,
      [RELIEF]: blockade,
    };
    const zones = map.deploymentZones!.flatMap(({ zones }) => zones);
    expect(zones.length).toBe(8);
    for (const zone of zones) {
      expect(zone.rotation).toBeDefined();
      if (zone.player === GARRISON) {
        // South, its team's default: turning the army inside two walled
        // zones stacks it, and its AI mans the walls facing the enemy.
        expect(apart(zone.rotation!, Math.PI / 2)).toBeLessThan(1e-3);
        continue;
      }
      const wanted = bearing(centreOf(zone.player!), targets[zone.player!]!);
      expect(apart(zone.rotation!, wanted)).toBeLessThan(Math.PI / 18);
    }
    // The French reserve faces down the map, the relief across it to the west.
    expect(apart(mainZoneOf(RESERVE)!.rotation!, Math.PI / 2)).toBeLessThan(Math.PI / 8);
    expect(apart(mainZoneOf(RELIEF)!.rotation!, Math.PI)).toBeLessThan(Math.PI / 4);
  });

  it("gives the French La Favorita and San Giorgio, and the garrison the Cittadella and the city", () => {
    expect(objectivesOf(1)).toHaveLength(2);
    expect(objectivesOf(2)).toHaveLength(2);
    for (const objective of scenario.objectives!) {
      expect(objective.type).toBe(ObjectiveType.Big);
    }
  });

  describe("heights at 5 m of real elevation a level", () => {
    it("sets every water body at one level, and the lakes, the Mincio and the Paiolo at level 0", () => {
      const bodies = waterBodies();
      for (const body of bodies) {
        expect(new Set(body.map(([x, y]) => heights[x]![y]))).toHaveProperty("size", 1);
      }
      // The three lakes, the Mincio and the Paiolo are every body of any size.
      const large = bodies.filter((body) => body.length >= 200);
      expect(large.length).toBeGreaterThanOrEqual(3);
      for (const [[x, y]] of large) {
        expect(heights[x]![y]).toBe(0);
      }
    });

    it("stands the city and the Cittadella at level 1, not on the DEM's rooftops", () => {
      // The town inside the enceinte, and the Cittadella across the Mulini.
      const town = [
        [98, 115, 145, 160],
        [106, 90, 126, 110],
      ];
      const levels = new Set<number>();
      for (const [x0, y0, x1, y1] of town) {
        for (let x = x0!; x < x1!; x++) {
          for (let y = y0!; y < y1!; y++) {
            if (terrains[x]![y] === TerrainType.Building) levels.add(heights[x]![y]!);
          }
        }
      }
      expect([...levels]).toEqual([1]);
    });

    it("rises from the southern plain to La Favorita and the north", () => {
      const meanLevel = (y0: number, y1: number) => {
        const levels = terrains.flatMap((column, x) =>
          column
            .slice(y0, y1)
            .flatMap((terrain, i) => (WATER.includes(terrain) ? [] : [heights[x]![y0 + i]!])),
        );
        return levels.reduce((sum, level) => sum + level, 0) / levels.length;
      };
      const [laFavorita] = objectivesOf(1);
      const { tx, ty } = tileOf(laFavorita!.pos);

      expect(meanLevel(0, 64) - meanLevel(192, 256)).toBeGreaterThanOrEqual(1);
      expect(heights[tx]![ty]).toBe(3);
    });

    it("never sets a tile more than one level above any of its neighbours", () => {
      const steep = heights.flatMap((column, x) =>
        column.flatMap((height, y) =>
          [-1, 0, 1].flatMap((dx) =>
            [-1, 0, 1]
              .map((dy) => heights[x + dx]?.[y + dy])
              .filter((other) => other !== undefined && Math.abs(other - height) > 1)
              .map(() => ({ x, y })),
          ),
        ),
      );
      expect(steep).toEqual([]);
    });
  });

  describe("the fortress", () => {
    const [cittadella] = objectivesOf(2);
    const [laFavorita] = objectivesOf(1);
    const passable = (category: string) => (terrain: TerrainType) =>
      manager.isPassable(terrain, category);
    const gatesShut =
      (open: (terrain: TerrainType) => boolean) =>
      (terrain: TerrainType, tx: number, ty: number) =>
        open(terrain) && !isGateOrCauseway(tx, ty);

    it("is walled with Rampart, not Fortified farm, and the blockade redoubts stay redoubts", () => {
      const counts = new Map<TerrainType, number>();
      for (const column of terrains) {
        for (const terrain of column) {
          counts.set(terrain, (counts.get(terrain) ?? 0) + 1);
        }
      }
      expect(counts.get(TerrainType.Rampart)).toBeGreaterThan(300);
      expect(counts.get(TerrainType.FortifiedFarm) ?? 0).toBe(0);
      expect(counts.get(TerrainType.Redoubt)).toBeGreaterThan(0);
    });

    it("keeps no gun strip of redoubt against the ramparts: the guns stand on them", () => {
      const four = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const againstRampart = terrains.flatMap((column, tx) =>
        column.filter(
          (terrain, ty) =>
            terrain === TerrainType.Redoubt &&
            four.some(([dx, dy]) => terrains[tx + dx!]?.[ty + dy!] === TerrainType.Rampart),
        ),
      );
      expect(againstRampart).toHaveLength(0);
    });

    it("stands its ramparts and redoubts level with the ground beside them, not as ridges or trenches", () => {
      const works = [TerrainType.Rampart, TerrainType.Redoubt];
      const offLevel: [number, number][] = [];
      terrains.forEach((column, tx) =>
        column.forEach((terrain, ty) => {
          if (!works.includes(terrain)) return;
          // The ground beside a work: neither another work nor the water it faces.
          const ground: number[] = [];
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const t = terrains[tx + dx]?.[ty + dy];
              if (t !== undefined && !works.includes(t) && !WATER.includes(t)) {
                ground.push(heights[tx + dx]![ty + dy]!);
              }
            }
          }
          if (ground.length > 0 && heights[tx]![ty]! !== Math.min(...ground)) {
            offLevel.push([tx, ty]);
          }
        }),
      );
      expect(offLevel).toEqual([]);
    });

    it("lets cavalry in only through its gates and causeways", () => {
      const cavalry = passable("lightCavalry");
      expect(reaches(laFavorita!.pos, cittadella!.pos, cavalry)).toBe(true);
      expect(reaches(laFavorita!.pos, cittadella!.pos, gatesShut(cavalry))).toBe(
        false,
      );
    });

    it("lets infantry climb the walls when the gates are shut", () => {
      expect(
        reaches(laFavorita!.pos, cittadella!.pos, gatesShut(passable("infantry"))),
      ).toBe(true);
    });

    it("lets the guns be hauled up onto the ramparts when the gates are shut", () => {
      expect(
        reaches(laFavorita!.pos, cittadella!.pos, gatesShut(passable("artillery"))),
      ).toBe(true);
    });

    it("would keep the guns out if the ramparts were fortified farms", () => {
      const asFarm = (terrain: TerrainType) =>
        terrain === TerrainType.Rampart ? TerrainType.FortifiedFarm : terrain;
      const artillery = passable("artillery");
      expect(
        reaches(
          laFavorita!.pos,
          cittadella!.pos,
          gatesShut((terrain) => artillery(asFarm(terrain))),
        ),
      ).toBe(false);
    });

    it("deploys the garrison inside the walls, on ground a unit can stand on", () => {
      for (const { outer } of mainZoneOf(GARRISON)!.polygons) {
        for (const corner of outer) {
          const { tx, ty } = tileOf(corner);
          const terrain = terrains[tx]![ty]!;
          expect(terrain).not.toBe(TerrainType.Rampart);
          expect(passable("lightCavalry")(terrain)).toBe(true);
        }
      }
    });
  });
});
