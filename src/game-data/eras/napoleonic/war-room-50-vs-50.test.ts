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
    expect(ScenarioFeatures.hasOneUnitPerPlayer(scenario)).toBe(true);
    expect(ScenarioFeatures.hasDeploymentPhase(scenario)).toBe(true);
    expect(ScenarioFeatures.getInitialTurnNumber(scenario)).toBe(0);

    const roster = describeManagedRoster(
      GameDataManager.createWithCustomDefs("napoleonic", scenario),
      scenario,
    );
    expect(roster.seats).toHaveLength(100);
    expect(roster.seats[0]).toMatchObject({
      unitSlotCount: 1,
      defaultForcePresetId: expect.stringMatching(/^unit:/),
    });
    expect(roster.seats[0]!.forcePresets.length).toBeGreaterThan(1);
  });
});
