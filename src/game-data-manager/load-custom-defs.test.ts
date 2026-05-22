import { GameDataManager } from "@lob-sdk/game-data-manager";
import { CUSTOM_UNIT_TYPE_MIN } from "@lob-sdk/scenario";
import {
  FormationTemplate,
  RangeUnitTemplate,
  UnitTemplate,
} from "@lob-sdk/types";
import {
  DamageTypeTemplate,
  UnitCategoryTemplate,
} from "@lob-sdk/game-data-manager";

describe("GameDataManager custom defs", () => {
  describe("createWithCustomDefs", () => {
    it("returns the era singleton when nothing is customized", () => {
      const a = GameDataManager.createWithCustomDefs("napoleonic", {});
      const b = GameDataManager.get("napoleonic");
      expect(a).toBe(b);
    });

    it("returns a fresh non-singleton when any custom def is non-empty", () => {
      const eraSingleton = GameDataManager.get("napoleonic");
      const custom = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitCategories: [
          { id: "drone", firingAltitude: 10 },
        ],
      });
      expect(custom).not.toBe(eraSingleton);
      // Singleton must not be mutated by the per-game manager.
      expect(() => eraSingleton.getUnitCategoryTemplate("drone")).toThrow();
    });

    it("treats empty arrays the same as omitted (still singleton)", () => {
      const a = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitTemplates: [],
        customDamageTypes: [],
        customUnitFormations: [],
        customUnitCategories: [],
        customTerrainCategories: [],
      });
      expect(a).toBe(GameDataManager.get("napoleonic"));
    });
  });

  describe("loadCustomDefs: custom unit categories", () => {
    it("makes the new category resolvable via getUnitCategoryTemplate", () => {
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitCategories: [
          { id: "drone", firingAltitude: 12, allyCollisionLevel: 0 },
        ],
      });
      const t = m.getUnitCategoryTemplate("drone");
      expect(t.id).toBe("drone");
      expect(t.firingAltitude).toBe(12);
    });

    it("re-expands terrain-category wildcards for new unit categories", () => {
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitCategories: [{ id: "drone", firingAltitude: 0 }],
      });
      // The era's terrain configs use a `*` wildcard for default movement.
      // Without the re-expansion, isPassable for an unknown category would
      // fall back to 0 ( > IMPASSABLE_THRESHOLD = -10) and silently report
      // every terrain as passable. With re-expansion, the result must match
      // what an existing category would get on the same terrain.
      const terrainType = m.getTerrains()[0]!.id;
      const builtInCategory = m.getUnitCategories()[0]!.id;
      // Same modifier ⇒ same passability ⇒ wildcard was applied.
      const droneMod = m.getMovementModifier(terrainType, "drone");
      const builtInMod = m.getMovementModifier(terrainType, builtInCategory);
      expect(droneMod).toBe(builtInMod);
    });

    it("wires allowedOrders correctly", () => {
      const orderName = "walk"; // a known napoleonic order
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitCategories: [
          { id: "drone", firingAltitude: 0, allowedOrders: [orderName] },
        ],
      });
      const allowed = m.getUnitCategoryAllowedOrders("drone");
      expect(allowed.length).toBe(1);
    });

    it("throws at load time if an allowedOrder name is unknown", () => {
      expect(() =>
        GameDataManager.createWithCustomDefs("napoleonic", {
          customUnitCategories: [
            {
              id: "drone",
              firingAltitude: 0,
              allowedOrders: ["no-such-order"],
            },
          ],
        }),
      ).toThrow(/Order no-such-order not found/);
    });
  });

  describe("loadCustomDefs: custom damage types", () => {
    const dt: DamageTypeTemplate = {
      id: 99001,
      name: "void-blade",
      orgDamageRatio: 0.7,
    };

    it("makes the damage type resolvable by id and by name", () => {
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customDamageTypes: [dt],
      });
      expect(m.getDamageTypeById(dt.id).name).toBe(dt.name);
      expect(m.getDamageTypeByName(dt.name).id).toBe(dt.id);
    });

    it("keeps the era singleton clean", () => {
      GameDataManager.createWithCustomDefs("napoleonic", {
        customDamageTypes: [dt],
      });
      const singleton = GameDataManager.get("napoleonic");
      expect(() => singleton.getDamageTypeByName(dt.name)).toThrow();
    });
  });

  describe("loadCustomDefs: custom formations", () => {
    // Clone a built-in formation so all required fields are present, then
    // give it a unique id.
    const builtInFormation = GameDataManager.get("napoleonic")
      .getUnitTemplateManager()
      .getTemplates()[0]!.formations[0]!;
    const formation: FormationTemplate = {
      ...(JSON.parse(JSON.stringify(builtInFormation)) as FormationTemplate),
      id: "phalanx",
    };

    it("makes the formation resolvable via FormationManager", () => {
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitFormations: [formation],
      });
      expect(m.getFormationManager().getTemplate("phalanx")).not.toBeNull();
    });

    it("does not clobber built-in formations", () => {
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitFormations: [formation],
      });
      // Pick any built-in formation id and verify it still resolves.
      const builtInId = GameDataManager.get("napoleonic")
        .getUnitTemplateManager()
        .getTemplates()[0]!.formations[0]!.id;
      expect(m.getFormationManager().getTemplate(builtInId)).not.toBeNull();
    });
  });

  describe("loadCustomDefs: custom unit templates", () => {
    const tmpl: UnitTemplate = (() => {
      const base = GameDataManager.get("napoleonic")
        .getUnitTemplateManager()
        .getTemplates()[0]!;
      return {
        ...(JSON.parse(JSON.stringify(base)) as RangeUnitTemplate),
        type: CUSTOM_UNIT_TYPE_MIN,
        name: "Test Custom",
      };
    })();

    it("makes the unit template resolvable", () => {
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitTemplates: [tmpl],
      });
      expect(m.getUnitTemplateManager().getTemplate(tmpl.type).name).toBe(
        "Test Custom",
      );
    });

    it("preserves access to built-in unit templates", () => {
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitTemplates: [tmpl],
      });
      const builtInType = GameDataManager.get("napoleonic")
        .getUnitTemplateManager()
        .getTemplates()[0]!.type;
      expect(() =>
        m.getUnitTemplateManager().getTemplate(builtInType),
      ).not.toThrow();
    });
  });

  describe("loadCustomDefs: custom terrain categories", () => {
    it("overrides an existing terrain category config", () => {
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customTerrainCategories: [
          {
            id: "forest",
            config: {
              staminaCostModifier: 99,
              canPlaceObjectives: true,
              movementModifier: { "*": 0 },
            },
          },
        ],
      });
      const tc = m.getTerrainCategories() as Record<string, any>;
      expect(tc.forest.staminaCostModifier).toBe(99);
      expect(tc.forest.canPlaceObjectives).toBe(true);
    });

    it("keeps the era singleton's terrain config untouched", () => {
      GameDataManager.createWithCustomDefs("napoleonic", {
        customTerrainCategories: [
          {
            id: "forest",
            config: { staminaCostModifier: 99 },
          },
        ],
      });
      const singleton = GameDataManager.get("napoleonic");
      const tc = singleton.getTerrainCategories() as Record<string, any>;
      // The singleton's forest category must not be mutated by per-game overrides.
      expect(tc.forest.staminaCostModifier).not.toBe(99);
    });

    it("keeps the era singleton's terrain modifier maps free of per-game custom categories", () => {
      GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitCategories: [{ id: "drone", firingAltitude: 0 }],
      });
      const singleton = GameDataManager.get("napoleonic");
      const tc = singleton.getTerrainCategories() as Record<string, any>;
      // expandTerrainCategoryWildcards must run on the per-game clone, not the
      // shared JSON import: no wildcard modifier map may gain a `drone` key.
      for (const category of Object.values(tc)) {
        for (const value of Object.values(category as Record<string, unknown>)) {
          if (value && typeof value === "object" && "*" in (value as object)) {
            expect(value).not.toHaveProperty("drone");
          }
        }
      }
    });

    it("re-expands wildcards over the overridden config", () => {
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitCategories: [{ id: "drone", firingAltitude: 0 }],
        customTerrainCategories: [
          {
            id: "forest",
            config: {
              // Wildcard so all unit categories (including drone) pick up
              // the default 0.5 movement modifier.
              movementModifier: { "*": 0.5 },
            },
          },
        ],
      });
      const tc = m.getTerrainCategories() as Record<string, any>;
      expect(tc.forest.movementModifier.drone).toBe(0.5);
    });
  });
});
