import { GameDataManager } from "@lob-sdk/game-data-manager";

describe("Battle of Teugn-Hausen scenario", () => {
  const manager = GameDataManager.get("napoleonic");
  const scenario = manager.getScenario("teugn-hausen-1809");

  it("seats 8 commanders against 10", () => {
    expect(scenario.players!.filter(({ team }) => team === 1)).toHaveLength(8);
    expect(scenario.players!.filter(({ team }) => team === 2)).toHaveLength(10);
  });

  it("fields only the era's own units, each owned by a seat", () => {
    const seats = new Set(scenario.players!.map(({ player }) => player));
    const templates = manager.getUnitTemplateManager();
    for (const unit of scenario.units!) {
      expect(seats.has(unit.player)).toBe(true);
      expect(templates.tryGetTemplate(unit.type)).toBeDefined();
    }
    expect(scenario.customUnitTemplates).toBeUndefined();
  });

  it("has a height for every terrain tile", () => {
    const { terrains, heightMap } = scenario.map!;
    expect(heightMap!.length).toBe(terrains.length);
    expect(heightMap!.every((column, x) => column.length === terrains[x]!.length)).toBe(true);
  });
});
