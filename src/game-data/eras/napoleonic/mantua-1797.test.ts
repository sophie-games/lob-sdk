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

/** A causeway, or a road running through a gap in the walls. */
const isGateOrCauseway = (tx: number, ty: number) => {
  const terrain = terrains[tx]![ty]!;
  if (terrain === TerrainType.Bridge) return true;
  if (terrain !== TerrainType.Road) return false;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (terrains[tx + dx]?.[ty + dy] === TerrainType.Wall) return true;
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

const objectivesOf = (team: number) =>
  scenario.objectives!.filter((objective) => objective.team === team);

const mainZoneOf = (player: number) =>
  map
    .deploymentZones!.flatMap(({ zones }) => zones)
    .find((zone) => zone.player === player && zone.type === "main");

describe("Mantua 1797", () => {
  it("seats the French blockade against the garrison and a relief column", () => {
    expect(scenario.allowDynamicArmy).toBe(true);
    expect(scenario.players).toEqual([
      { player: FRENCH, team: 1 },
      { player: GARRISON, team: 2 },
      { player: RELIEF, team: 2 },
    ]);
    for (const player of [FRENCH, GARRISON, RELIEF]) {
      expect(mainZoneOf(player)).toBeDefined();
    }
  });

  it("gives the French La Favorita and San Giorgio, and the garrison the Cittadella and the city", () => {
    expect(objectivesOf(1)).toHaveLength(2);
    expect(objectivesOf(2)).toHaveLength(2);
    for (const objective of scenario.objectives!) {
      expect(objective.type).toBe(ObjectiveType.Big);
    }
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

    it("is walled with Wall terrain, and the blockade redoubts stay redoubts", () => {
      const counts = new Map<TerrainType, number>();
      for (const column of terrains) {
        for (const terrain of column) {
          counts.set(terrain, (counts.get(terrain) ?? 0) + 1);
        }
      }
      expect(counts.get(TerrainType.Wall)).toBeGreaterThan(300);
      expect(counts.get(TerrainType.Redoubt)).toBeGreaterThan(0);
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

    it("deploys the garrison inside the walls, on ground a unit can stand on", () => {
      for (const { outer } of mainZoneOf(GARRISON)!.polygons) {
        for (const corner of outer) {
          const { tx, ty } = tileOf(corner);
          const terrain = terrains[tx]![ty]!;
          expect(terrain).not.toBe(TerrainType.Wall);
          expect(passable("lightCavalry")(terrain)).toBe(true);
        }
      }
    });
  });
});
