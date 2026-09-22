import type { Scenario } from "@lob-sdk/types";
import { polygonFromBounds } from "../utils/deployment-zone";
import { ScenarioFeatures } from "./scenario-features";

const scenario = (overrides: Partial<Scenario> = {}): Scenario =>
  ({
    version: 2,
    name: "Event template",
    description: "Reusable rostered map",
    map: {},
    players: [{ player: 1, team: 1 }],
    units: [{ player: 1, type: 1 }],
    allowDynamicArmy: false,
    ...overrides,
  }) as Scenario;

describe("ScenarioFeatures.isFixedRosterPreset", () => {
  it("recognizes a fixed map with predefined players and units", () => {
    expect(ScenarioFeatures.isFixedRosterPreset(scenario())).toBe(true);
  });

  it.each([
    ["map", { map: undefined }],
    ["players", { players: undefined }],
    ["units", { units: [] }],
    ["fixed army", { allowDynamicArmy: true }],
  ])("requires a preset %s", (_requirement, overrides) => {
    expect(ScenarioFeatures.isFixedRosterPreset(scenario(overrides))).toBe(
      false,
    );
  });
});

describe("ScenarioFeatures.hasOneUnitPerPlayer", () => {
  it("recognizes a preset with exactly one unit for every player", () => {
    expect(ScenarioFeatures.hasOneUnitPerPlayer(scenario())).toBe(true);
  });

  it("rejects more than one unit for a player", () => {
    expect(
      ScenarioFeatures.hasOneUnitPerPlayer(
        scenario({
          units: [
            { player: 1, type: 1, pos: { x: 0, y: 0 }, rotation: 0 },
            { player: 1, type: 2, pos: { x: 1, y: 1 }, rotation: 0 },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("rejects a player without a unit", () => {
    expect(
      ScenarioFeatures.hasOneUnitPerPlayer(
        scenario({
          players: [
            { player: 1, team: 1 },
            { player: 2, team: 2 },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("rejects units that do not belong to a preset player", () => {
    expect(
      ScenarioFeatures.hasOneUnitPerPlayer(
        scenario({
          units: [
            { player: 1, type: 1, pos: { x: 0, y: 0 }, rotation: 0 },
            { player: 99, type: 2, pos: { x: 1, y: 1 }, rotation: 0 },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("rejects a dynamic roster", () => {
    expect(
      ScenarioFeatures.hasOneUnitPerPlayer(
        scenario({ allowDynamicArmy: true }),
      ),
    ).toBe(false);
  });
});

describe("ScenarioFeatures.hasAssignableDeploymentZones", () => {
  const withZone = {
    map: {
      deploymentZones: [
        {
          team: 1,
          zones: [
            {
              team: 1,
              type: "main" as const,
              polygons: [polygonFromBounds(0, 0, 32, 32)],
            },
          ],
        },
      ],
    },
  } as Partial<Scenario>;

  it("is on when the scenario opts in and has a deployment phase", () => {
    expect(
      ScenarioFeatures.hasAssignableDeploymentZones(
        scenario({ ...withZone, assignableDeploymentZones: true }),
      ),
    ).toBe(true);
  });

  it.each([
    ["no opt-in", withZone],
    ["no deployment phase", { assignableDeploymentZones: true }],
  ])("is off with %s", (_case, overrides) => {
    expect(
      ScenarioFeatures.hasAssignableDeploymentZones(scenario(overrides)),
    ).toBe(false);
  });
});

describe("ScenarioFeatures.hasDeploymentPhase", () => {
  it("uses the resolved map and requires at least one zone", () => {
    const fixed = scenario({
      map: { deploymentZones: [] } as unknown as Scenario["map"],
    });
    expect(ScenarioFeatures.hasDeploymentPhase(fixed)).toBe(false);
    expect(ScenarioFeatures.getInitialTurnNumber(fixed)).toBe(1);
    expect(
      ScenarioFeatures.hasDeploymentPhase(fixed, {
        deploymentZones: [
          {
            team: 1,
            zones: [
              {
                team: 1,
                type: "main",
                polygons: [polygonFromBounds(0, 0, 32, 32)],
              },
            ],
          },
        ],
      }),
    ).toBe(true);
    expect(
      ScenarioFeatures.getInitialTurnNumber(fixed, {
        deploymentZones: [
          {
            team: 1,
            zones: [
              {
                team: 1,
                type: "main",
                polygons: [polygonFromBounds(0, 0, 32, 32)],
              },
            ],
          },
        ],
      }),
    ).toBe(0);
  });

  it("keeps procedural maps at turn 0 when their default zones are generated", () => {
    expect(
      ScenarioFeatures.hasDeploymentPhase(scenario({ map: undefined })),
    ).toBe(true);
  });
});
