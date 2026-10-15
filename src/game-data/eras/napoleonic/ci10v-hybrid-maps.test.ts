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

  it.each(["antioch", "grobes-schlachtfeld", "road-to-amnis-nucum"])(
    "no longer ships %s",
    (name) => {
      expect(manager.getScenarioNames()).not.toContain(name);
    },
  );
});
