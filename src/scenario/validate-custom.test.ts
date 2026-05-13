import {
  CUSTOM_UNIT_TYPE_MIN,
  validateScenarioCustomDefs,
} from "./validate-custom";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import {
  CustomTerrainCategoryOverride,
  FormationTemplate,
  RangeUnitTemplate,
  Scenario,
  UnitTemplate,
} from "@lob-sdk/types";
import {
  DamageTypeTemplate,
  MeleeDamageTypeTemplate,
  UnitCategoryTemplate,
} from "@lob-sdk/game-data-manager";

const era = GameDataManager.get("napoleonic");

// Tiny helper so each test only spells out the fields it cares about.
function makeScenario(partial: Partial<Scenario>): Scenario {
  return {
    name: "test",
    description: "test",
    ...partial,
  };
}

function makeMeleeDt(overrides: Partial<MeleeDamageTypeTemplate> = {}): DamageTypeTemplate {
  return {
    id: 10000,
    name: "custom-melee",
    orgDamageRatio: 0.5,
    ...overrides,
  };
}

function makeFormation(overrides: Partial<FormationTemplate> = {}): FormationTemplate {
  return {
    id: "custom-line",
    baseSprite: "infantry/line",
    collisionCircles: 5,
    collisionCircleSize: 8,
    ...overrides,
  } as FormationTemplate;
}

function makeCategory(
  overrides: Partial<UnitCategoryTemplate> = {},
): UnitCategoryTemplate {
  return {
    id: "drone",
    firingAltitude: 5,
    ...overrides,
  };
}

function makeUnitTemplate(
  overrides: Partial<RangeUnitTemplate> = {},
): UnitTemplate {
  const builtIn = era.getUnitTemplateManager().getTemplates()[0];
  return {
    ...JSON.parse(JSON.stringify(builtIn)),
    type: CUSTOM_UNIT_TYPE_MIN,
    name: "Custom Unit",
    ...overrides,
  };
}

describe("validateScenarioCustomDefs", () => {
  it("returns no errors for an empty scenario", () => {
    expect(validateScenarioCustomDefs(makeScenario({}), era)).toEqual([]);
  });

  describe("custom damage types", () => {
    it("flags id collision with a built-in damage type", () => {
      const builtInId = era.getDamageTypes()[0]!.id;
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customDamageTypes: [makeMeleeDt({ id: builtInId, name: "x" })],
        }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "damageType" &&
        e.message.includes("collides with a built-in"),
      )).toBe(true);
    });

    it("flags name collision with a built-in damage type", () => {
      const builtInName = era.getDamageTypes()[0]!.name;
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customDamageTypes: [makeMeleeDt({ name: builtInName })],
        }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "damageType" &&
        e.message.includes(`name "${builtInName}"`),
      )).toBe(true);
    });

    it("flags duplicate ids within the custom list", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customDamageTypes: [
            makeMeleeDt({ id: 99001, name: "a" }),
            makeMeleeDt({ id: 99001, name: "b" }),
          ],
        }),
        era,
      );
      expect(errors.some((e) => /Duplicate custom damage type id/.test(e.message))).toBe(true);
    });

    it("flags duplicate names within the custom list", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customDamageTypes: [
            makeMeleeDt({ id: 99001, name: "same" }),
            makeMeleeDt({ id: 99002, name: "same" }),
          ],
        }),
        era,
      );
      expect(errors.some((e) => /Duplicate custom damage type name/.test(e.message))).toBe(true);
    });
  });

  describe("custom unit formations", () => {
    it("flags collision with a built-in formation id", () => {
      // Find a real built-in formation id (formations are referenced from
      // unit templates).
      const someFormation = era
        .getUnitTemplateManager()
        .getTemplates()
        .flatMap((t) => t.formations)[0]!.id;
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customUnitFormations: [makeFormation({ id: someFormation })],
        }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "unitFormation" &&
        e.message.includes("collides with a built-in formation"),
      )).toBe(true);
    });

    it("flags duplicate ids within the custom list", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customUnitFormations: [
            makeFormation({ id: "my-formation" }),
            makeFormation({ id: "my-formation" }),
          ],
        }),
        era,
      );
      expect(errors.some((e) => /Duplicate custom formation id/.test(e.message))).toBe(true);
    });
  });

  describe("custom unit categories", () => {
    it("flags empty / whitespace id", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({ customUnitCategories: [makeCategory({ id: "  " })] }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "unitCategory" && /id is required/.test(e.message),
      )).toBe(true);
    });

    it("flags collision with a built-in unit category id", () => {
      const builtInId = era.getUnitCategories()[0]!.id;
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customUnitCategories: [makeCategory({ id: builtInId })],
        }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "unitCategory" &&
        e.message.includes("collides with a built-in"),
      )).toBe(true);
    });

    it("flags allowedOrders with an unknown order name", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customUnitCategories: [
            makeCategory({
              id: "drone",
              allowedOrders: ["this-order-does-not-exist"],
            }),
          ],
        }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "unitCategory" &&
        e.message.includes("allowedOrders entry"),
      )).toBe(true);
    });

    it("accepts allowedOrders referencing real order names", () => {
      const realOrder = era
        .getOrderTypes()
        .map((id) => era.tryGetOrderTemplate(id)?.name)
        .find((n): n is string => !!n);
      expect(realOrder).toBeTruthy();
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customUnitCategories: [
            makeCategory({ id: "drone", allowedOrders: [realOrder!] }),
          ],
        }),
        era,
      );
      expect(errors.filter((e) => e.scope === "unitCategory")).toEqual([]);
    });

    it("flags duplicate ids within the custom list", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customUnitCategories: [
            makeCategory({ id: "drone" }),
            makeCategory({ id: "drone" }),
          ],
        }),
        era,
      );
      expect(errors.some((e) => /Duplicate custom unit category id/.test(e.message))).toBe(true);
    });
  });

  describe("custom terrain categories", () => {
    const minimalOverride = (id: string): CustomTerrainCategoryOverride => ({
      id,
      config: {},
    });

    it("flags empty / whitespace id", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({ customTerrainCategories: [minimalOverride("  ")] }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "terrainCategory" && /id is required/.test(e.message),
      )).toBe(true);
    });

    it("flags duplicate ids", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customTerrainCategories: [minimalOverride("forest"), minimalOverride("forest")],
        }),
        era,
      );
      expect(errors.some((e) => /Duplicate custom terrain category id/.test(e.message))).toBe(true);
    });

    it("flags missing config block", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customTerrainCategories: [
            { id: "forest", config: undefined as never },
          ],
        }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "terrainCategory" && /missing its config block/.test(e.message),
      )).toBe(true);
    });

    it("accepts an override of an existing built-in category id", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customTerrainCategories: [
            { id: "forest", config: { staminaCostModifier: 0.1 } },
          ],
        }),
        era,
      );
      expect(errors.filter((e) => e.scope === "terrainCategory")).toEqual([]);
    });
  });

  describe("custom unit templates", () => {
    it("flags type id below CUSTOM_UNIT_TYPE_MIN", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customUnitTemplates: [makeUnitTemplate({ type: 5 })],
        }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "unitTemplate" &&
        e.message.includes(`must be >= ${CUSTOM_UNIT_TYPE_MIN}`),
      )).toBe(true);
    });

    it("flags type id collision with a built-in", () => {
      // Pick a real built-in id (the constructor enforces >= 10000 for
      // customs, but the check still fires on collision before that gate
      // when a malicious / hand-edited JSON sets a low id).
      const builtInType = era.getUnitTemplateManager().getTemplates()[0]!.type;
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customUnitTemplates: [makeUnitTemplate({ type: builtInType })],
        }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "unitTemplate" &&
        e.message.includes("collides with a built-in unit type"),
      )).toBe(true);
    });

    it("flags duplicate ids within the custom list", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customUnitTemplates: [
            makeUnitTemplate({ type: CUSTOM_UNIT_TYPE_MIN }),
            makeUnitTemplate({ type: CUSTOM_UNIT_TYPE_MIN }),
          ],
        }),
        era,
      );
      expect(errors.some((e) => /Duplicate custom unit type id/.test(e.message))).toBe(true);
    });

    it("flags unknown category cross-ref", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customUnitTemplates: [
            makeUnitTemplate({ category: "nope-not-a-category" }),
          ],
        }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "unitTemplate" &&
        e.message.includes("is not a built-in or custom unit category"),
      )).toBe(true);
    });

    it("accepts a category that is defined in customUnitCategories", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customUnitCategories: [makeCategory({ id: "drone" })],
          customUnitTemplates: [makeUnitTemplate({ category: "drone" })],
        }),
        era,
      );
      expect(errors.filter((e) => e.scope === "unitTemplate")).toEqual([]);
    });

    it("flags unknown meleeDamageType cross-ref", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customUnitTemplates: [
            makeUnitTemplate({ meleeDamageType: "no-such-damage-type" }),
          ],
        }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "unitTemplate" &&
        e.message.includes("meleeDamageType"),
      )).toBe(true);
    });

    it("accepts a meleeDamageType defined in customDamageTypes", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customDamageTypes: [makeMeleeDt({ name: "void-blade" })],
          customUnitTemplates: [
            makeUnitTemplate({ meleeDamageType: "void-blade" }),
          ],
        }),
        era,
      );
      expect(errors.filter((e) =>
        e.scope === "unitTemplate" && e.message.includes("meleeDamageType"),
      )).toEqual([]);
    });

    it("flags unknown formation cross-refs", () => {
      const tmpl = makeUnitTemplate({
        formations: [{ id: "nope-formation", baseSprite: "x" }] as any,
        defaultFormation: "nope-formation",
      });
      const errors = validateScenarioCustomDefs(
        makeScenario({ customUnitTemplates: [tmpl] }),
        era,
      );
      // Both the formations[].id check and defaultFormation check should fire.
      expect(
        errors.filter(
          (e) =>
            e.scope === "unitTemplate" &&
            (e.message.includes("formation id") ||
              e.message.includes("defaultFormation")),
        ).length,
      ).toBeGreaterThanOrEqual(2);
    });

    it("flags defaultFormation that isn't in the unit's formations[]", () => {
      // Regression: a clone whose formations array was rewritten ("fly" only)
      // while defaultFormation still pointed at the original ("mass"). The
      // global formation manager knows both ids, so the prior check passed,
      // but the unit's sprite lookup goes through unit.formations.find(...)
      // and returns undefined — the unit renders as the "unknown" sprite and
      // collisions use the wrong template. The mismatch must surface here.
      const tmpl = makeUnitTemplate({
        formations: [{ id: "line", baseSprite: "infantry/line" }] as any,
        defaultFormation: "mass", // known to the era, but not in formations[]
      });
      const errors = validateScenarioCustomDefs(
        makeScenario({ customUnitTemplates: [tmpl] }),
        era,
      );
      const mismatchErrors = errors.filter(
        (e) =>
          e.scope === "unitTemplate" &&
          e.message.includes("must match one of the unit's formations"),
      );
      expect(mismatchErrors).toHaveLength(1);
    });

    it("accepts defaultFormation that matches one of the unit's formations", () => {
      const tmpl = makeUnitTemplate({
        formations: [{ id: "line", baseSprite: "infantry/line" }] as any,
        defaultFormation: "line",
      });
      const errors = validateScenarioCustomDefs(
        makeScenario({ customUnitTemplates: [tmpl] }),
        era,
      );
      const mismatchErrors = errors.filter(
        (e) =>
          e.scope === "unitTemplate" &&
          e.message.includes("must match one of the unit's formations"),
      );
      expect(mismatchErrors).toHaveLength(0);
    });
  });
});
