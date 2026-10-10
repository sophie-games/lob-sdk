import { GameDataManager } from "@lob-sdk/game-data-manager";

describe("Battle of Caldiero scenario", () => {
  const manager = GameDataManager.get("napoleonic");
  const scenario = manager.getScenario("caldiero-1805");

  it("seats 18 commanders a side", () => {
    expect(scenario.players!.filter(({ team }) => team === 1)).toHaveLength(18);
    expect(scenario.players!.filter(({ team }) => team === 2)).toHaveLength(18);
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
