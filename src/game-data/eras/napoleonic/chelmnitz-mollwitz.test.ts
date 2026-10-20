import { GameDataManager } from "@lob-sdk/game-data-manager";

describe("Clash at Chelmnitz and Combat at Mollwitz", () => {
  const manager = GameDataManager.get("napoleonic");
  const nameOf = new Map(
    manager.getTerrains().map(({ id, name }) => [id, name] as const),
  );
  const chains = {
    water: new Set(["shallowWater", "deepWater", "ice", "bridge"]),
    road: new Set(["road", "roadWinter", "dirt", "sunkenRoad", "bridge"]),
  };

  // A corner-only staircase lets troops slip between two water tiles and
  // breaks a road's line; scripts/connect-diagonal-terrain.py joins each step.
  it.each(["clash-at-chelmnitz", "combat-at-mollwitz"])(
    "offers %s with every river and road tile joined through a side",
    (name) => {
      expect(manager.getScenarioNames()).toContain(name);
      const { terrains } = manager.getScenario(name).map!;
      for (const [chain, members] of Object.entries(chains)) {
        const inChain = (x: number, y: number) =>
          members.has(nameOf.get(terrains[x]?.[y] ?? -1) ?? "");
        const cornerOnly: string[] = [];
        for (let x = 0; x + 1 < terrains.length; x++) {
          for (let y = 0; y < terrains[x]!.length; y++) {
            for (const y2 of [y - 1, y + 1]) {
              if (
                inChain(x, y) &&
                inChain(x + 1, y2) &&
                !inChain(x + 1, y) &&
                !inChain(x, y2)
              ) {
                cornerOnly.push(`${chain} ${x},${y} - ${x + 1},${y2}`);
              }
            }
          }
        }
        expect(cornerOnly).toEqual([]);
      }
    },
  );

  // A road between water on opposite sides is where it crosses a river.
  it.each(["clash-at-chelmnitz", "combat-at-mollwitz"])(
    "crosses %s's rivers on bridges",
    (name) => {
      const { terrains } = manager.getScenario(name).map!;
      const at = (x: number, y: number) =>
        nameOf.get(terrains[x]?.[y] ?? -1) ?? "";
      const wet = (x: number, y: number) => chains.water.has(at(x, y));
      const fords: string[] = [];
      terrains.forEach((column, x) =>
        column.forEach((_, y) => {
          if (
            chains.road.has(at(x, y)) &&
            at(x, y) !== "bridge" &&
            ((wet(x - 1, y) && wet(x + 1, y)) || (wet(x, y - 1) && wet(x, y + 1)))
          ) {
            fords.push(`${x},${y}`);
          }
        }),
      );
      expect(fords).toEqual([]);
    },
  );
});
