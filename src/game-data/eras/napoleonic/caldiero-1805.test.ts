import { GameDataManager } from "@lob-sdk/game-data-manager";

describe("Battle of Caldiero scenario", () => {
  const manager = GameDataManager.get("napoleonic");
  const scenario = manager.getScenario("caldiero-1805");

  it("seats 18 commanders a side", () => {
    expect(scenario.players!.filter(({ team }) => team === 1)).toHaveLength(18);
    expect(scenario.players!.filter(({ team }) => team === 2)).toHaveLength(18);
  });

  // Each side's nine division seats come first, so a part-filled lobby seats
  // division heads and the empty brigade seats pass to them. Counts identify
  // the seats of Daluven's order-of-battle sheet.
  it("seats each side's division heads before its brigades", () => {
    const unitsOf = (player: number) =>
      scenario.units!.filter((unit) => unit.player === player).length;
    expect(scenario.players!.map(({ player }) => unitsOf(player))).toEqual([
      11, 5, 12, 8, 9, 9, 9, 5, 4, 4, 7, 12, 8, 13, 12, 9, 4, 5,
      10, 5, 5, 12, 7, 10, 10, 4, 4, 5, 7, 8, 9, 9, 8, 8, 4, 4,
    ]);
    expect(scenario.players!.map(({ player }) => player)).toEqual(
      Array.from({ length: 36 }, (_, index) => index + 1),
    );
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

  it("names every objective after its ground", () => {
    expect(scenario.objectives!.map(({ name }) => name)).toContain("Caldiero");
    expect(scenario.objectives!.every(({ name }) => name)).toBe(true);
  });
});
