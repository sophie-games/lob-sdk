import { GameDataManager } from "@lob-sdk/game-data-manager";
import {
  describeManagedRoster,
  normalizeScenario,
  ScenarioFeatures,
} from "@lob-sdk/scenario";
import type { RawScenarioInput } from "@lob-sdk/scenario";
import { napoleonicScenarioCatalog } from "./scenario-catalog";

describe("War Room 50v50 preset", () => {
  it("provides 100 one-unit seats and opens with deployment", () => {
    const rawScenario = (
      napoleonicScenarioCatalog as unknown as Record<string, RawScenarioInput>
    )["war-room-50-vs-50"];

    expect(rawScenario).toBeDefined();

    const scenario = normalizeScenario(rawScenario!);
    const teamCounts = scenario.players!.reduce<Record<number, number>>(
      (counts, player) => ({
        ...counts,
        [player.team]: (counts[player.team] ?? 0) + 1,
      }),
      {},
    );

    expect(teamCounts).toEqual({ 1: 50, 2: 50 });
    expect(scenario.players).toHaveLength(100);
    expect(scenario.units).toHaveLength(100);
    const unitTypeCountsByTeam = scenario.units!.reduce<
      Record<number, Record<number, number>>
    >((counts, unit) => {
      const team = scenario.players!.find(
        (player) => player.player === unit.player,
      )!.team;
      counts[team] ??= {};
      counts[team]![unit.type] = (counts[team]![unit.type] ?? 0) + 1;
      return counts;
    }, {});
    expect(unitTypeCountsByTeam).toEqual({
      1: { 1: 38, 3: 4, 11: 8 },
      2: { 1: 38, 3: 4, 11: 8 },
    });

    const formationTypes = (team: number) =>
      scenario
        .units!.filter((unit) =>
          scenario.players!.some(
            (player) => player.player === unit.player && player.team === team,
          ),
        )
        .sort(
          (a, b) =>
            (team === 1 ? a.pos.y - b.pos.y : b.pos.y - a.pos.y) ||
            a.pos.x - b.pos.x,
        )
        .map((unit) => unit.type);
    expect(formationTypes(1)).toEqual(formationTypes(2));
    expect(ScenarioFeatures.hasOneUnitPerPlayer(scenario)).toBe(true);
    expect(ScenarioFeatures.hasDeploymentPhase(scenario)).toBe(true);
    expect(ScenarioFeatures.getInitialTurnNumber(scenario)).toBe(0);

    const roster = describeManagedRoster(
      GameDataManager.createWithCustomDefs("napoleonic", scenario),
      scenario,
    );
    expect(roster.seats).toHaveLength(100);
    for (const seat of roster.seats) {
      const unit = scenario.units!.find(
        (candidate) => candidate.player === seat.playerNumber,
      );
      expect(seat).toMatchObject({
        unitSlotCount: 1,
        defaultForcePresetId: `unit:${unit!.type}`,
      });
      expect(seat.forcePresets).toEqual([
        expect.objectContaining({
          id: `unit:${unit!.type}`,
          units: [unit!.type],
        }),
      ]);
    }
  });
});
