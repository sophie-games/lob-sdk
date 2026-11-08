import { EngagementRange, GameDataManager } from "@lob-sdk/game-data-manager";
import { standoffDistance } from "@lob-sdk/unit/weapon-range";
import { RangeUnitTemplate } from "@lob-sdk/types";

const gameDataManager = GameDataManager.get("napoleonic");
const templates = gameDataManager.getUnitTemplateManager().getTemplates();

const template = (name: string) =>
  templates.find((t) => t.name === name) as RangeUnitTemplate;

// What a unit stops at with no approach picked: Medium, or its fire tier when lower.
const standoffAt = (name: string, approachTier?: EngagementRange) => {
  const unit = template(name);
  const fireTier =
    gameDataManager.getUnitCategoryTemplate(unit.category).defaultAutofireRange ??
    EngagementRange.Max;
  return standoffDistance({
    rangedDamageTypes: unit.rangedDamageTypes ?? [],
    approachTier: approachTier ?? Math.min(EngagementRange.Medium, fireTier),
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

  it.each([
    ["line_infantry", 44.1],
    ["guards", 44.1],
    ["light_infantry", 44.1],
    ["militia", 44.1],
    ["grenadiers", 44.1],
    ["horse_archers", 64.8],
    ["skirmishers", 64.8],
    ["rifles", 64.8],
    ["4lb_artillery", 100],
    ["6lb_artillery", 120],
    ["6lb_artillery_horse", 120],
    ["8lb_artillery", 135],
    ["12lb_artillery", 145],
    ["rockets", 148.5],
    ["6in_howitzer", 90],
    ["10lb_licorne", 90],
    ["18lb_licorne", 110],
    ["ship_of_the_line", 0],
  ])("%s stops at %p", (name, expected) => {
    expect(standoffAt(name)).toBeCloseTo(expected, 1);
  });
});
