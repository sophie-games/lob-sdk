import { GameDataManager } from "@lob-sdk/game-data-manager";
import type { ArmyOrganization } from "@lob-sdk/types";
import {
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
