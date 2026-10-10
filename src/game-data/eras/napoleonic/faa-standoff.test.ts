import { EngagementRange, GameDataManager } from "@lob-sdk/game-data-manager";
import { standoffDistance } from "@lob-sdk/unit/weapon-range";
import { RangeUnitTemplate } from "@lob-sdk/types";

const gameDataManager = GameDataManager.get("napoleonic");
const templates = gameDataManager.getUnitTemplateManager().getTemplates();

const template = (name: string) =>
  templates.find((t) => t.name === name) as RangeUnitTemplate;

const standoffAt = (name: string, tier?: EngagementRange) => {
  const unit = template(name);
  return standoffDistance({
    rangedDamageTypes: unit.rangedDamageTypes ?? [],
    tier:
      tier ??
      gameDataManager.getUnitCategoryTemplate(unit.category)
        .defaultAutofireRange ??
      EngagementRange.Max,
    legacyStandoff: unit.minDistanceToFAA,
    gameDataManager,
  });
};

describe("napoleonic stand-off distances", () => {
  it("carries no hand-tuned distance on any template", () => {
    expect(
      templates
        .filter((t) => (t as RangeUnitTemplate).minDistanceToFAA !== undefined)
        .map((t) => t.name),
    ).toEqual([]);
  });

  // The weapons' `preferredRange` reproduces what the templates used to hold, so this is a
  // pure move: the numbers below are the ones the game shipped with.
  it.each([
    ["line_infantry", 35],
    ["guards", 35],
    ["light_infantry", 35],
    ["militia", 35],
    ["grenadiers", 35],
    ["horse_archers", 35],
    ["skirmishers", 65],
    ["rifles", 65],
    ["4lb_artillery", 90],
    ["6lb_artillery", 110],
    ["6lb_artillery_horse", 110],
    ["8lb_artillery", 120],
    ["12lb_artillery", 130],
    ["rockets", 75],
    ["6in_howitzer", 50],
    ["10lb_licorne", 55],
    ["18lb_licorne", 80],
    ["ship_of_the_line", 0],
  ])("%s still stops at %p", (name, expected) => {
    expect(standoffAt(name)).toBeCloseTo(expected, 1);
  });

  it("closes in rather than holding fire when the player throttles the tier", () => {
    // Each of these used to stop outside the range its tier allowed, and never fired.
    expect(standoffAt("line_infantry", EngagementRange.Low)).toBeCloseTo(
      23.4,
      2,
    );
    expect(standoffAt("skirmishers", EngagementRange.Low)).toBeCloseTo(35.1, 2);
    expect(standoffAt("rifles", EngagementRange.Low)).toBeCloseTo(64.8, 2);
  });

  it("leaves the guns where they are at every tier", () => {
    for (const tier of [
      EngagementRange.Low,
      EngagementRange.Medium,
      EngagementRange.Max,
    ]) {
      expect(standoffAt("12lb_artillery", tier)).toBeCloseTo(130, 1);
    }
  });
});
