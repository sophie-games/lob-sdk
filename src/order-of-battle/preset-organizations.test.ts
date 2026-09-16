import { GameDataManager } from "@lob-sdk/game-data-manager";
import { normalizeScenario } from "@lob-sdk/scenario";
import type { RawScenarioInput } from "@lob-sdk/scenario";
import type { Scenario } from "@lob-sdk/types";
import type { GameEra } from "@lob-sdk/game-data-manager/types";
import { napoleonicScenarioCatalog } from "@lob-sdk/game-data/eras/napoleonic/scenario-catalog";
import { ww2ScenarioCatalog } from "@lob-sdk/game-data/eras/ww2/scenario-catalog";
import { validateOrganization } from "./validate";

const catalogs: [GameEra, Record<string, RawScenarioInput>][] = [
  ["napoleonic", napoleonicScenarioCatalog],
  ["ww2", ww2ScenarioCatalog],
];

const cases = catalogs.flatMap(([era, catalog]) =>
  Object.entries(catalog).map(
    ([name, raw]) => [era, name, normalizeScenario(raw)] as const,
  ),
);

const withOrganization = cases.filter(([, , scenario]) => scenario.organizations);

it.each(cases)("%s/%s has a valid organization", (era, _name, scenario) => {
  const manager = GameDataManager.get(era);
  expect(
    validateOrganization(
      scenario,
      manager.getOrganizationDoctrine(),
      new Set(manager.getUnitCategories().map((category) => category.id)),
    ),
  ).toEqual([]);
});

it("covers every historical battle that places its own units", () => {
  expect(withOrganization.map(([, name]) => name).sort()).toEqual([
    "battle-of-france",
    "battle-of-moscow",
    "borodino",
    "dresden",
    "leipzig",
    "waterloo",
  ]);
});

describe.each(withOrganization)("%s/%s", (_era, _name, scenario) => {
  const units = scenario.units ?? [];
  const members = (scenario as Scenario).organizations!.flatMap((org) =>
    org.divisions.flatMap((division) =>
      division.brigades.flatMap((brigade) => brigade.unitIds),
    ),
  );

  // An authored order of battle replaces the seeding the client would do from
  // the era doctrine, so a unit it forgets is one the player finds unattached.
  it("leaves no unit out of the order of battle", () => {
    expect(units.every((unit) => unit.id !== undefined)).toBe(true);
    expect([...new Set(members)].sort((a, b) => a - b)).toEqual(
      units.map((unit) => unit.id),
    );
  });

  it("gives every player with units an organization", () => {
    const players = new Set(units.map((unit) => unit.player));
    expect(
      new Set((scenario as Scenario).organizations!.map((org) => org.player)),
    ).toEqual(players);
  });

  // A brigade is the body a group order moves, and a division the control
  // group behind it; either one left empty is a row the player cannot use.
  it("has no empty division or brigade", () => {
    for (const org of (scenario as Scenario).organizations!) {
      expect(org.divisions.length).toBeGreaterThan(0);
      for (const division of org.divisions) {
        expect(division.brigades.length).toBeGreaterThan(0);
        for (const brigade of division.brigades) {
          expect(brigade.unitIds.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
