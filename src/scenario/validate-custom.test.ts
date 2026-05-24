import {
  CUSTOM_UNIT_TYPE_MIN,
  MAX_CUSTOM_SPRITES,
  MAX_CUSTOM_TERRAIN_CATEGORIES,
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

  describe("abuse count caps", () => {
    it("flags too many custom terrain categories", () => {
      const customTerrainCategories: CustomTerrainCategoryOverride[] =
        Array.from({ length: MAX_CUSTOM_TERRAIN_CATEGORIES + 1 }, (_, i) => ({
          id: `terrain_${i}`,
          config: {},
        }));
      const errors = validateScenarioCustomDefs(
        makeScenario({ customTerrainCategories }),
        era,
      );
      expect(
        errors.some(
          (e) =>
            e.scope === "terrainCategory" &&
            /Too many custom terrain categories/.test(e.message),
        ),
      ).toBe(true);
    });

    it("flags too many custom sprites", () => {
      const customSprites = Object.fromEntries(
        Array.from({ length: MAX_CUSTOM_SPRITES + 1 }, (_, i) => [
          `cs_${i}`,
          { dataUrl: "data:image/webp;base64,AAAA", width: 8, height: 8 },
        ]),
      );
      const errors = validateScenarioCustomDefs(
        makeScenario({ customSprites }),
        era,
      );
      expect(
        errors.some(
          (e) =>
            e.scope === "customSprite" &&
            /Too many custom sprites/.test(e.message),
        ),
      ).toBe(true);
    });

    it("accepts a collection exactly at the cap", () => {
      const customTerrainCategories: CustomTerrainCategoryOverride[] =
        Array.from({ length: MAX_CUSTOM_TERRAIN_CATEGORIES }, (_, i) => ({
          id: `terrain_${i}`,
          config: {},
        }));
      const errors = validateScenarioCustomDefs(
        makeScenario({ customTerrainCategories }),
        era,
      );
      expect(errors.some((e) => /Too many custom/.test(e.message))).toBe(false);
    });
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

    it("flags a damage type with a missing/non-numeric id", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customDamageTypes: [
            makeMeleeDt({ id: undefined as unknown as number, name: "x" }),
          ],
        }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "damageType" && /id is required/.test(e.message),
      )).toBe(true);
    });

    it("flags a damage type with a missing name", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customDamageTypes: [makeMeleeDt({ name: "  " })],
        }),
        era,
      );
      expect(errors.some((e) =>
        e.scope === "damageType" && /name is required/.test(e.message),
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

    it("flags ranged damage types with no range brackets", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customDamageTypes: [
            {
              id: 99003,
              name: "empty-ranged",
              orgDamageRatio: 0.5,
              ranged: true,
              ranges: [],
              projectileWidth: 4,
              areaOfEffect: {
                type: "circular",
                ranges: [{ start: 0, end: 100, startRadius: 0, endRadius: 0 }],
                edgeDamageModifier: 1,
              },
            } as unknown as DamageTypeTemplate,
          ],
        }),
        era,
      );
      expect(
        errors.some((e) => /needs at least one range bracket/.test(e.message)),
      ).toBe(true);
    });

    it("flags a ranged damage type with `ranges` omitted entirely (no crash)", () => {
      const scenario = makeScenario({
        customDamageTypes: [
          {
            id: 99003,
            name: "missing-ranges",
            orgDamageRatio: 0.5,
            ranged: true,
          } as unknown as DamageTypeTemplate,
        ],
      });
      let errors!: ReturnType<typeof validateScenarioCustomDefs>;
      expect(() => {
        errors = validateScenarioCustomDefs(scenario, era);
      }).not.toThrow();
      expect(
        errors.some((e) => /needs at least one range bracket/.test(e.message)),
      ).toBe(true);
    });

    it("accepts ranged damage types with at least one range bracket", () => {
      const errors = validateScenarioCustomDefs(
        makeScenario({
          customDamageTypes: [
            {
              id: 99004,
              name: "valid-ranged",
              orgDamageRatio: 0.5,
              ranged: true,
              ranges: [{ start: 0, end: 100, startMod: 1, endMod: 1 }],
              projectileWidth: 4,
              areaOfEffect: {
                type: "circular",
                ranges: [{ start: 0, end: 100, startRadius: 0, endRadius: 0 }],
                edgeDamageModifier: 1,
              },
            } as unknown as DamageTypeTemplate,
          ],
        }),
        era,
      );
      expect(
        errors.some((e) => /needs at least one range bracket/.test(e.message)),
      ).toBe(false);
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

    it("flags formations: []", () => {
      const tmpl = makeUnitTemplate({ formations: [] });
      const errors = validateScenarioCustomDefs(
        makeScenario({ customUnitTemplates: [tmpl] }),
        era,
      );
      expect(
        errors.some(
          (e) =>
            e.scope === "unitTemplate" &&
            /unit needs at least one formation/.test(e.message),
        ),
      ).toBe(true);
    });

    it("flags a unit template with `formations` omitted entirely (no crash)", () => {
      const tmpl = makeUnitTemplate();
      delete (tmpl as { formations?: unknown }).formations;
      let errors!: ReturnType<typeof validateScenarioCustomDefs>;
      expect(() => {
        errors = validateScenarioCustomDefs(
          makeScenario({ customUnitTemplates: [tmpl] }),
          era,
        );
      }).not.toThrow();
      expect(
        errors.some(
          (e) =>
            e.scope === "unitTemplate" &&
            /unit needs at least one formation/.test(e.message),
        ),
      ).toBe(true);
    });

    it("flags rangedAttack > 0 with empty rangedDamageTypes", () => {
      const tmpl = makeUnitTemplate({
        rangedAttack: 100,
        rangedDamageTypes: [],
      });
      const errors = validateScenarioCustomDefs(
        makeScenario({ customUnitTemplates: [tmpl] }),
        era,
      );
      expect(
        errors.some(
          (e) =>
            e.scope === "unitTemplate" &&
            /runtime will crash on getMaxRange/.test(e.message),
        ),
      ).toBe(true);
    });

    it("flags a rangedDamageType that references a melee damage type", () => {
      // Pick any built-in melee damage type by name.
      const meleeName = era
        .getDamageTypes()
        .find((dt) => dt.ranged !== true)!.name;
      const tmpl = makeUnitTemplate({
        rangedAttack: 100,
        rangedDamageTypes: [meleeName],
      });
      const errors = validateScenarioCustomDefs(
        makeScenario({ customUnitTemplates: [tmpl] }),
        era,
      );
      expect(
        errors.some(
          (e) =>
            e.scope === "unitTemplate" &&
            /references a melee damage type/.test(e.message),
        ),
      ).toBe(true);
    });

    it("accepts a rangedDamageType that references a ranged damage type", () => {
      const rangedName = era
        .getDamageTypes()
        .find((dt) => dt.ranged === true)!.name;
      const tmpl = makeUnitTemplate({
        rangedAttack: 100,
        rangedDamageTypes: [rangedName],
      });
      const errors = validateScenarioCustomDefs(
        makeScenario({ customUnitTemplates: [tmpl] }),
        era,
      );
      expect(
        errors.some((e) => /references a melee damage type/.test(e.message)),
      ).toBe(false);
    });
  });
});

describe("validateCustomSprites", () => {
  const validSprite = {
    dataUrl: "data:image/webp;base64,AAAA",
    width: 64,
    height: 96,
  };
  const spriteErrors = (partial: Partial<Scenario>) =>
    validateScenarioCustomDefs(makeScenario(partial), era).filter(
      (e) => e.scope === "customSprite",
    );

  it("accepts a valid webp/png data-URL", () => {
    expect(spriteErrors({ customSprites: { cs_ok: validSprite } })).toEqual([]);
  });

  it("rejects a non-image data-URL", () => {
    const errors = spriteErrors({
      customSprites: {
        cs_bad: { dataUrl: "data:text/plain;base64,AAAA", width: 1, height: 1 },
      },
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("cs_bad");
  });

  it("rejects non-positive dimensions", () => {
    const errors = spriteErrors({
      customSprites: {
        cs_zero: {
          dataUrl: "data:image/webp;base64,AAAA",
          width: 0,
          height: 10,
        },
      },
    });
    expect(errors.some((e) => e.field === "cs_zero")).toBe(true);
  });

  it("rejects a sprite over the per-sprite byte cap", () => {
    const errors = spriteErrors({
      customSprites: {
        cs_big: {
          dataUrl: "data:image/webp;base64," + "A".repeat(70000),
          width: 10,
          height: 10,
        },
      },
    });
    expect(errors.some((e) => /per-sprite/.test(e.message))).toBe(true);
  });

  it("flags a formation referencing a missing cs_ sprite", () => {
    const errors = spriteErrors({
      customUnitTemplates: [
        makeUnitTemplate({
          formations: [{ id: "line", baseSprite: "cs_missing" }],
        }),
      ],
      customSprites: {},
    });
    expect(errors.some((e) => /missing custom sprite/.test(e.message))).toBe(
      true,
    );
  });
});
