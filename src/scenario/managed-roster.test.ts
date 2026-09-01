import { GameDataManager } from "@lob-sdk/game-data-manager";
import type { Scenario } from "@lob-sdk/types";
import {
  describeManagedRoster,
  ManagedRosterError,
  materializeManagedRoster,
} from "./managed-roster";

const multiUnitScenario = (): Scenario => ({
  version: 1,
  name: "Reusable brigade map",
  description: "One brigade per player",
  map: { width: 256, height: 256, terrains: [], heightMap: [] },
  players: [{ player: 1, team: 1 }],
  units: [
    { player: 1, type: 1, pos: { x: 40, y: 40 }, rotation: 0 },
    { player: 1, type: 1, pos: { x: 70, y: 40 }, rotation: 0 },
    { player: 1, type: 2, pos: { x: 100, y: 40 }, rotation: 0 },
  ],
  allowDynamicArmy: false,
  managedRoster: {
    forcePresets: [
      {
        id: "mixed-brigade",
        name: "Mixed brigade",
        units: [1, 1, 2],
        leaderUnitIndex: 2,
      },
    ],
  },
});

describe("describeManagedRoster", () => {
  it("exposes a reusable multi-unit force preset for each fixed seat", () => {
    expect(
      describeManagedRoster(
        GameDataManager.get("napoleonic"),
        multiUnitScenario(),
      ),
    ).toEqual({
      seats: [
        {
          playerNumber: 1,
          team: 1,
          unitSlotCount: 3,
          defaultForcePresetId: "mixed-brigade",
          forcePresets: [
            {
              id: "mixed-brigade",
              name: "Mixed brigade",
              units: [1, 1, 2],
              leaderUnitIndex: 2,
            },
          ],
        },
      ],
    });
  });

  it("normalizes the existing one-unit picker into force presets", () => {
    const scenario: Scenario = {
      version: 1,
      name: "One unit per player",
      description: "Existing War Room format",
      map: { width: 256, height: 256, terrains: [], heightMap: [] },
      players: [{ player: 1, team: 1 }],
      units: [{ player: 1, type: 2, pos: { x: 40, y: 40 }, rotation: 0 }],
      allowDynamicArmy: false,
    };

    const [seat] = describeManagedRoster(
      GameDataManager.get("napoleonic"),
      scenario,
    ).seats;

    expect(seat.defaultForcePresetId).toBe("unit:2");
    expect(seat.forcePresets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "unit:1", units: [1], unitNameType: 1 }),
        expect.objectContaining({ id: "unit:2", units: [2], unitNameType: 2 }),
      ]),
    );
  });

  it("does not mark scenario-owned one-unit Force Presets for translation", () => {
    const scenario = multiUnitScenario();
    scenario.managedRoster!.forcePresets = [
      { id: "unit:imperial-guard", name: "Imperial Guard", units: [1] },
    ];

    const [forcePreset] = describeManagedRoster(
      GameDataManager.get("napoleonic"),
      scenario,
    ).seats[0].forcePresets;

    expect(forcePreset).toEqual({
      id: "unit:imperial-guard",
      name: "Imperial Guard",
      units: [1],
    });
  });

  it.each([
    null,
    {},
    { forcePresets: null },
    { forcePresets: [null] },
    { forcePresets: [], seats: [null] },
  ])("rejects malformed managed-roster runtime data: %p", (managedRoster) => {
    const scenario = multiUnitScenario();
    scenario.managedRoster = managedRoster as never;

    expect(() =>
      describeManagedRoster(GameDataManager.get("napoleonic"), scenario),
    ).toThrow(new ManagedRosterError("INVALID_MANAGED_ROSTER"));
  });

  it("rejects force presets that name an unknown unit type", () => {
    const scenario = multiUnitScenario();
    scenario.managedRoster!.forcePresets[0]!.units = [999999];

    expect(() =>
      describeManagedRoster(GameDataManager.get("napoleonic"), scenario),
    ).toThrow(new ManagedRosterError("INVALID_MANAGED_ROSTER"));
  });

  it("rejects a leader outside its force preset", () => {
    const scenario = multiUnitScenario();
    scenario.managedRoster!.forcePresets[0]!.leaderUnitIndex = 3;

    expect(() =>
      describeManagedRoster(GameDataManager.get("napoleonic"), scenario),
    ).toThrow(new ManagedRosterError("INVALID_MANAGED_ROSTER"));
  });

  it("rejects ambiguous force preset identifiers", () => {
    const scenario = multiUnitScenario();
    scenario.managedRoster!.forcePresets.push({
      ...scenario.managedRoster!.forcePresets[0]!,
    });

    expect(() =>
      describeManagedRoster(GameDataManager.get("napoleonic"), scenario),
    ).toThrow(new ManagedRosterError("INVALID_MANAGED_ROSTER"));
  });

  it("rejects a force that cannot fit in a seat's map slots", () => {
    const scenario = multiUnitScenario();
    scenario.managedRoster!.forcePresets[0]!.units = [1, 1, 1, 1];

    expect(() =>
      describeManagedRoster(GameDataManager.get("napoleonic"), scenario),
    ).toThrow(new ManagedRosterError("INSUFFICIENT_UNIT_SLOTS"));
  });

  it("rejects seat options that reference an unknown force preset", () => {
    const scenario = multiUnitScenario();
    scenario.managedRoster!.seats = [
      {
        player: 1,
        forcePresetIds: ["missing"],
        defaultForcePresetId: "missing",
      },
    ];

    expect(() =>
      describeManagedRoster(GameDataManager.get("napoleonic"), scenario),
    ).toThrow(new ManagedRosterError("INVALID_MANAGED_ROSTER"));
  });
});

describe("materializeManagedRoster", () => {
  it("rejects a scenario without a fixed roster", () => {
    const scenario: Scenario = {
      version: 1,
      name: "Dynamic battle",
      description: "Players build their armies",
      allowDynamicArmy: true,
    };

    expect(() =>
      materializeManagedRoster(GameDataManager.get("napoleonic"), scenario, []),
    ).toThrow(new ManagedRosterError("INVALID_MANAGED_ROSTER"));
  });

  it("fills ordered map slots from the selected force and identifies its leader", () => {
    const template = multiUnitScenario();
    template.managedRoster!.forcePresets.push({
      id: "light-brigade",
      name: "Light brigade",
      units: [2, 1],
      leaderUnitIndex: 1,
    });

    const result = materializeManagedRoster(
      GameDataManager.get("napoleonic"),
      template,
      [{ playerNumber: 1, forcePresetId: "light-brigade" }],
    );

    expect(result.scenario.units).toEqual([
      { player: 1, type: 2, pos: { x: 40, y: 40 }, rotation: 0 },
      { player: 1, type: 1, pos: { x: 70, y: 40 }, rotation: 0 },
    ]);
    expect(result.leaderUnitIndexByPlayer).toEqual({ 1: 1 });
    expect(result.scenario.managedRoster).toBeUndefined();
    expect(template.units).toHaveLength(3);
  });

  it("rejects a force selection that the seat does not offer", () => {
    expect(() =>
      materializeManagedRoster(
        GameDataManager.get("napoleonic"),
        multiUnitScenario(),
        [{ playerNumber: 1, forcePresetId: "flying-elephants" }],
      ),
    ).toThrow(new ManagedRosterError("UNKNOWN_FORCE_PRESET"));
  });
});
