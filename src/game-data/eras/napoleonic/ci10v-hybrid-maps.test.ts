import { GameDataManager } from "@lob-sdk/game-data-manager";

describe("ci10v's hybrid maps", () => {
  const manager = GameDataManager.get("napoleonic");

  it.each(["hillshire", "grunlingen", "frozen-swamp"])(
    "offers %s with a height for every terrain tile",
    (name) => {
      expect(manager.getScenarios()).toContain(name);
      const { terrains, heightMap } = manager.getScenario(name).map!;
      expect(heightMap!.length).toBe(terrains.length);
      expect(
        heightMap!.every((column, x) => column.length === terrains[x]!.length),
      ).toBe(true);
    },
  );

  // Seat numbers per side vary with team size: in Micro 10v10 player 2 is on
  // team 1, and an objective's DTO keeps only its player, so it would switch sides.
  it.each(["hillshire", "grunlingen", "frozen-swamp"])(
    "gives %s's objectives a side by team, not by player number",
    (name) => {
      const { objectives = [] } = manager.getScenario(name);
      expect(
        objectives.filter(({ player }) => player !== undefined),
      ).toEqual([]);
    },
  );

  it.each(["antioch", "grobes-schlachtfeld", "road-to-amnis-nucum"])(
    "no longer ships %s",
    (name) => {
      expect(manager.getScenarioNames()).not.toContain(name);
    },
  );
});
