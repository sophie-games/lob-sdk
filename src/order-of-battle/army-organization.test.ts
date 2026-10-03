import { GameDataManager } from "@lob-sdk/game-data-manager";
import {
  ARMY_ORGANIZATION_VERSION,
  type ArmyOrganization,
} from "@lob-sdk/types";
import {
  MAX_ORGANIZATION_NAME_LENGTH,
  materializeArmyOrganization,
  validateArmyOrganization,
} from "./army-organization";

const manager = GameDataManager.get("napoleonic");
const doctrine = manager.getOrganizationDoctrine();

const organization: ArmyOrganization = {
  version: 1,
  divisions: [
    {
      kind: "infantry",
      name: "I Division",
      brigades: [
        { kind: "line", name: "1st Brigade", units: { 1: 2, 16: 1 } },
        { kind: "artillery", units: { 12: 1 } },
      ],
    },
  ],
};

describe("army organization presets", () => {
  it("validates a compact preset against the complete deployed roster", () => {
    expect(
      validateArmyOrganization(organization, doctrine, {
        1: 2,
        12: 1,
        16: 1,
      }),
    ).toEqual([]);
  });

  it("rejects unknown data, empty bodies and roster mismatches", () => {
    const invalid: ArmyOrganization = {
      version: 1,
      divisions: [
        { kind: "unknown", brigades: [] },
        {
          kind: "infantry",
          brigades: [{ kind: "unknown", units: { 1: 1.5, 999: 2 } }],
        },
      ],
    };

    expect(validateArmyOrganization(invalid, doctrine, { 1: 2 })).toEqual(
      expect.arrayContaining([
        "Unknown division kind unknown",
        "Divisions and brigades cannot be empty",
        "Unknown brigade kind unknown",
        "Organization unit counts must be positive integers",
        "Organization units must exactly match the deployed army",
      ]),
    );
  });

  it("accepts names up to the shared limit and the current version only", () => {
    const named = (name: string): ArmyOrganization => ({
      ...organization,
      divisions: [{ ...organization.divisions[0], name }],
    });
    const roster = { 1: 2, 12: 1, 16: 1 };

    expect(
      validateArmyOrganization(
        named("x".repeat(MAX_ORGANIZATION_NAME_LENGTH)),
        doctrine,
        roster,
      ),
    ).toEqual([]);
    expect(
      validateArmyOrganization(
        named("x".repeat(MAX_ORGANIZATION_NAME_LENGTH + 1)),
        doctrine,
        roster,
      ),
    ).toEqual([
      `Organization names must be at most ${MAX_ORGANIZATION_NAME_LENGTH} characters`,
    ]);
    expect(
      validateArmyOrganization(
        { ...organization, version: ARMY_ORGANIZATION_VERSION + 1 },
        doctrine,
        roster,
      ),
    ).toEqual(["Invalid army organization"]);
  });

  it("accepts a skin per unit type the brigade holds, and nothing else", () => {
    const withSkins = (skins: unknown) => {
      const brigade = { ...organization.divisions[0].brigades[0], skins };
      return {
        ...organization,
        divisions: [
          {
            ...organization.divisions[0],
            brigades: [brigade, organization.divisions[0].brigades[1]],
          },
        ],
      };
    };
    const roster = { 1: 2, 12: 1, 16: 1 };

    expect(
      validateArmyOrganization(withSkins({ 1: 17, 16: 129 }), doctrine, roster),
    ).toEqual([]);
    for (const invalid of [{ 12: 8 }, { 1: 1.5 }, { 1: "17" }, [17], null]) {
      expect(
        validateArmyOrganization(withSkins(invalid), doctrine, roster),
      ).toEqual(["Invalid brigade skins"]);
    }
  });

  it("carries brigade skins onto the materialized brigade", () => {
    const skinned: ArmyOrganization = {
      ...organization,
      divisions: [
        {
          ...organization.divisions[0],
          brigades: [
            { ...organization.divisions[0].brigades[0], skins: { 1: 17 } },
            organization.divisions[0].brigades[1],
          ],
        },
      ],
    };

    expect(
      materializeArmyOrganization(skinned, 3, [
        { id: 10, type: 1 },
        { id: 11, type: 12 },
        { id: 12, type: 1 },
        { id: 13, type: 16 },
      ])?.divisions[0].brigades[0],
    ).toEqual({
      kind: "line",
      name: "1st Brigade",
      unitIds: [10, 12, 13],
      skins: { 1: 17 },
    });
  });

  it("materializes counts into stable, unique unit ids", () => {
    expect(
      materializeArmyOrganization(organization, 3, [
        { id: 10, type: 1 },
        { id: 11, type: 12 },
        { id: 12, type: 1 },
        { id: 13, type: 16 },
      ]),
    ).toEqual({
      player: 3,
      divisions: [
        {
          kind: "infantry",
          name: "I Division",
          brigades: [
            { kind: "line", name: "1st Brigade", unitIds: [10, 12, 13] },
            { kind: "artillery", unitIds: [11] },
          ],
        },
      ],
    });
  });

  it("refuses to materialize a preset that no longer matches the roster", () => {
    expect(
      materializeArmyOrganization(organization, 1, [
        { id: 10, type: 1 },
        { id: 11, type: 12 },
      ]),
    ).toBeNull();
  });
});
