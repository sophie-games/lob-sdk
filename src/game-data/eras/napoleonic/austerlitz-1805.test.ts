import { GameDataManager } from "@lob-sdk/game-data-manager";
import { validateScenarioCustomDefs } from "@lob-sdk/scenario/validate-custom";
import { GameTriggerConditionType } from "@lob-sdk/types/trigger";

describe("Battle of Austerlitz scenario", () => {
  const manager = GameDataManager.get("napoleonic");
  const scenario = manager.getScenario("austerlitz-1805");

  it("seats six French commands against eight allied", () => {
    expect(scenario.players!.filter(({ team }) => team === 1)).toHaveLength(6);
    expect(scenario.players!.filter(({ team }) => team === 2)).toHaveLength(8);
  });

  it("opens at dawn and brings Davout on at 08:00 and 08:45", () => {
    expect(scenario.startTime).toBe("06:30");
    expect(scenario.maxTurn).toBe(42);
    expect(
      scenario.triggers!.flatMap(({ conditions }) =>
        conditions.flatMap((condition) =>
          condition.type === GameTriggerConditionType.IsTurn ? [condition.value] : [],
        ),
      ),
    ).toEqual([7, 10]);
  });

  it("splits twelve 100 VP objectives evenly between the armies", () => {
    const teamOf = new Map(scenario.players!.map(({ player, team }) => [player, team]));
    const objectives = scenario.objectives!;
    expect(objectives).toHaveLength(12);
    expect(objectives.every(({ vp }) => vp === 100)).toBe(true);
    expect(objectives.filter(({ player }) => teamOf.get(player!) === 1)).toHaveLength(6);
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

  // Units are numbered by array position, so ids with a gap put whole brigades
  // under another command's organization.
  it("passes the game's own scenario validation", () => {
    expect(validateScenarioCustomDefs(scenario, manager)).toEqual([]);
  });

  it("has a height for every terrain tile", () => {
    const { terrains, heightMap } = scenario.map!;
    expect(heightMap!.length).toBe(terrains.length);
    expect(heightMap!.every((column, x) => column.length === terrains[x]!.length)).toBe(true);
  });
});
