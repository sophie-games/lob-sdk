import { GameDataManager } from "@lob-sdk/game-data-manager";
import type { OrganizationDoctrine } from "./types";
import type { Scenario } from "@lob-sdk/types";
import { validateOrganization } from "./validate";
import { validateScenarioCustomDefs } from "@lob-sdk/scenario/validate-custom";

const manager = GameDataManager.get("napoleonic");
const doctrine = manager.getOrganizationDoctrine();
const validate = (data: unknown) =>
  validateOrganization(
    data as Scenario,
    doctrine,
    new Set(manager.getUnitCategories().map((c) => c.id)),
  );
const valid = {
  units: [
    { id: 1, player: 1 },
    { id: 2, player: 2 },
  ],
  organizations: [
    {
      player: 1,
      divisions: [
        { name: "Guard", brigades: [{ name: "First", unitIds: [1] }] },
      ],
    },
  ],
};

it("accepts explicit membership and an intentionally empty organization", () => {
  expect(validate(valid)).toEqual([]);
  expect(validate({ organizations: [{ player: 1, divisions: [] }] })).toEqual(
    [],
  );
});

it.each([
  [999, "missing explicit unit id"],
  [2, "another player"],
])("rejects invalid membership %s", (id, message) => {
  expect(
    validate({
      ...valid,
      organizations: [
        { player: 1, divisions: [{ brigades: [{ unitIds: [id] }] }] },
      ],
    }).join(),
  ).toContain(message);
});

it("rejects duplicate membership and duplicate player definitions", () => {
  expect(
    validate({
      ...valid,
      organizations: [...valid.organizations, ...valid.organizations],
    }).join(),
  ).toContain("Duplicate organization");
  expect(
    validate({
      ...valid,
      organizations: [
        { player: 1, divisions: [{ brigades: [{ unitIds: [1, 1] }] }] },
      ],
    }).join(),
  ).toContain("more than one brigade");
});

it.each([
  null,
  [],
  42,
  { divisions: [], brigades: {} },
  { divisions: [null], brigades: {} },
])("rejects malformed doctrine %s without throwing", (organizationDoctrine) => {
  expect(validate({ organizationDoctrine }).length).toBeGreaterThan(0);
});

it("validates limits and support references", () => {
  const bad: OrganizationDoctrine = {
    ...doctrine,
    divisions: doctrine.divisions.map((d, index) =>
      index
        ? d
        : { ...d, maxTroops: 0, support: [{ kind: "missing", maxBlocks: 1 }] },
    ),
  };
  const errors = validate({ organizationDoctrine: bad }).join();
  expect(errors).toContain("maxTroops");
  expect(errors).toContain("support rule");
});

it("loads scenario-specific doctrine without leaking into another game", () => {
  const custom: OrganizationDoctrine = {
    defaultDivisionKind: "fleet",
    defaultBrigadeKind: "squadron",
    brigades: { squadron: { name: "{{n}} Squadron" } },
    divisions: [
      {
        id: "fleet",
        name: "{{n}} Fleet",
        categories: ["infantry"],
        brigadeKind: "squadron",
        maxTroops: 6,
        maxPerBrigade: 2,
        maxBrigades: 3,
        row: "front",
        position: "centre",
      },
    ],
  };
  expect(validate({ organizationDoctrine: custom })).toEqual([]);
  const game = GameDataManager.createWithCustomDefs("napoleonic", {
    organizationDoctrine: custom,
  });
  expect(game.getOrganizationDoctrine()).toEqual(custom);
  expect(manager.getOrganizationDoctrine()).toBe(doctrine);
  game.loadCustomDefs({});
  expect(game.getOrganizationDoctrine()).toBe(doctrine);
});

it("runs organization validation on the normal scenario import path", () => {
  const errors = validateScenarioCustomDefs(
    {
      ...valid,
      organizations: [
        { player: 1, divisions: [{ brigades: [{ unitIds: [999] }] }] },
      ],
    } as unknown as Scenario,
    manager,
  );
  expect(errors.some((error) => error.scope === "organization")).toBe(true);
});
