import { GameDataManager } from "@lob-sdk/game-data-manager";
import { CUSTOM_UNIT_TYPE_MIN } from "@lob-sdk/scenario";
import {
  FormationTemplate,
  RangeUnitTemplate,
  TerrainType,
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
      // Without the re-expansion a new category would miss the wildcard value
      // and read 0, so it must match what an existing category gets.
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

    it("overrides a built-in unit template by type id without duplicating it", () => {
      const eraSingleton = GameDataManager.get("napoleonic");
      const builtIn = eraSingleton.getUnitTemplateManager().getTemplates()[0]!;
      const override: UnitTemplate = {
        ...(JSON.parse(JSON.stringify(builtIn)) as RangeUnitTemplate),
        // Same type id ⇒ this is an override, not a new template.
        type: builtIn.type,
        name: "Overridden",
        hp: builtIn.hp + 1000,
      };

      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitTemplates: [override],
      });

      // Lookup returns the override.
      expect(m.getUnitTemplateManager().getTemplate(builtIn.type).name).toBe(
        "Overridden",
      );
      // The merged templates array contains exactly one entry for this type.
      const all = m.getUnitTemplateManager().getTemplates();
      expect(all.filter((t) => t.type === builtIn.type).length).toBe(1);
      // Era singleton stays untouched.
      expect(
        eraSingleton.getUnitTemplateManager().getTemplate(builtIn.type).name,
      ).toBe(builtIn.name);
    });
  });

  describe("loadCustomDefs: overrides", () => {
    it("overrides a built-in damage type by id without duplicating it", () => {
      const eraSingleton = GameDataManager.get("napoleonic");
      const builtIn = eraSingleton.getDamageTypes()[0]!;
      const override: DamageTypeTemplate = {
        ...builtIn,
        orgDamageRatio: (builtIn.orgDamageRatio ?? 0) + 0.5,
      };

      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customDamageTypes: [override],
      });

      expect(m.getDamageTypeById(builtIn.id).orgDamageRatio).toBe(
        (builtIn.orgDamageRatio ?? 0) + 0.5,
      );
      expect(
        m.getDamageTypes().filter((d) => d.id === builtIn.id).length,
      ).toBe(1);
      // Singleton untouched.
      expect(eraSingleton.getDamageTypeById(builtIn.id).orgDamageRatio).toBe(
        builtIn.orgDamageRatio,
      );
    });

    it("overrides a built-in unit category by id without duplicating it", () => {
      const eraSingleton = GameDataManager.get("napoleonic");
      const builtIn = eraSingleton.getUnitCategories()[0]!;
      const override: UnitCategoryTemplate = {
        ...builtIn,
        firingAltitude: (builtIn.firingAltitude ?? 0) + 5,
      };

      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitCategories: [override],
      });

      expect(m.getUnitCategoryTemplate(builtIn.id).firingAltitude).toBe(
        (builtIn.firingAltitude ?? 0) + 5,
      );
      expect(
        m.getUnitCategories().filter((c) => c.id === builtIn.id).length,
      ).toBe(1);
    });

    it("overrides a built-in formation by id and clears its FF-immune set when the override drops it", () => {
      const eraSingleton = GameDataManager.get("napoleonic");
      // Walk every formation id referenced by any unit template and pull
      // the full FormationTemplate (not the per-unit UnitFormationTemplate)
      // so we get at the FF-immune list.
      const formationIds = new Set(
        eraSingleton
          .getUnitTemplateManager()
          .getTemplates()
          .flatMap((t) => t.formations.map((f) => f.id)),
      );
      let ffImmune: FormationTemplate | null = null;
      for (const id of formationIds) {
        const tmpl = eraSingleton.getFormationManager().getTemplate(id);
        if ((tmpl?.friendlyFireImmuneDamageTypes?.length ?? 0) > 0) {
          ffImmune = tmpl;
          break;
        }
      }
      if (!ffImmune) return; // Era has no FF-immune formations; skip.

      const override: FormationTemplate = {
        ...(JSON.parse(JSON.stringify(ffImmune)) as FormationTemplate),
        friendlyFireImmuneDamageTypes: [],
      };
      const someDamageType = ffImmune.friendlyFireImmuneDamageTypes![0]!;

      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitFormations: [override],
      });

      expect(
        m
          .getFormationManager()
          .isFriendlyFireImmune(ffImmune.id, someDamageType),
      ).toBe(false);
      // Singleton stays immune.
      expect(
        eraSingleton
          .getFormationManager()
          .isFriendlyFireImmune(ffImmune.id, someDamageType),
      ).toBe(true);
    });

    it("resolves cross-refs through overrides (built-in unit pulls overridden damage type)", () => {
      const eraSingleton = GameDataManager.get("napoleonic");
      // Pick a built-in unit template that has a melee damage type so we can
      // verify a built-in unit picks up an overridden damage type by name.
      const builtInUnit = eraSingleton
        .getUnitTemplateManager()
        .getTemplates()[0]!;
      const builtInDt = eraSingleton.getDamageTypeByName(
        builtInUnit.meleeDamageType,
      );
      const dtOverride: DamageTypeTemplate = {
        ...builtInDt,
        // Full override: id and name match the built-in, only stats change.
        orgDamageRatio: (builtInDt.orgDamageRatio ?? 0) + 0.7,
      };

      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customDamageTypes: [dtOverride],
      });

      // The built-in unit (not overridden) still points at the same damage-
      // type name string, but `getDamageTypeByName` now returns the override.
      const unitFromPerGame = m
        .getUnitTemplateManager()
        .getTemplate(builtInUnit.type);
      expect(unitFromPerGame.meleeDamageType).toBe(builtInUnit.meleeDamageType);
      expect(
        m.getDamageTypeByName(unitFromPerGame.meleeDamageType).orgDamageRatio,
      ).toBe((builtInDt.orgDamageRatio ?? 0) + 0.7);

      // Era singleton's cross-ref stays on the unmodified damage type.
      expect(
        eraSingleton.getDamageTypeByName(builtInUnit.meleeDamageType)
          .orgDamageRatio,
      ).toBe(builtInDt.orgDamageRatio);
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

    it("blocks a category via the impassable flag on a custom override", () => {
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customTerrainCategories: [
          { id: "forest", config: { impassable: { infantry: true } } },
        ],
      });
      expect(m.isPassable(TerrainType.Forest, "infantry")).toBe(false);
      // Categories without the flag stay passable.
      expect(m.isPassable(TerrainType.Forest, "artillery")).toBe(true);
    });

    it("re-expands the impassable `*` wildcard to new unit categories", () => {
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitCategories: [{ id: "drone", firingAltitude: 0 }],
      });
      // deepWater is impassable via `*`; the new category must inherit it
      // instead of falling through to the passable default.
      expect(m.isPassable(TerrainType.DeepWater, "drone")).toBe(false);
    });
  });

  describe("loadCustomDefs: game constants & rules", () => {
    it("applies a constant override without mutating the era singleton", () => {
      const eraSingleton = GameDataManager.get("napoleonic");
      const baseTile = eraSingleton.getGameConstants().TILE_SIZE;
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customGameConstants: { TILE_SIZE: baseTile + 16 },
      });
      expect(m.getGameConstants().TILE_SIZE).toBe(baseTile + 16);
      expect(eraSingleton.getGameConstants().TILE_SIZE).toBe(baseTile);
    });

    it("deep-merges a nested rule override, keeping untouched siblings", () => {
      const eraSingleton = GameDataManager.get("napoleonic");
      const baseRadius = eraSingleton.getGameRules().objectives.radius;
      const baseRegainRate = eraSingleton.getGameRules().organization.regainRate;
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customGameRules: { objectives: { radius: baseRadius + 10 } },
      });
      expect(m.getGameRules().objectives.radius).toBe(baseRadius + 10);
      // Sibling group untouched by the partial merge.
      expect(m.getGameRules().organization.regainRate).toBe(baseRegainRate);
      // Singleton untouched.
      expect(eraSingleton.getGameRules().objectives.radius).toBe(baseRadius);
    });

    it("recomputes the head-on cosine cache when the angle constant changes", () => {
      const eraSingleton = GameDataManager.get("napoleonic");
      const baseCosine = eraSingleton.getHeadOnCollisionCosineThresholdSquared();
      const baseAngle =
        eraSingleton.getGameConstants().HEAD_ON_COLLISION_ANGLE_DEGREES;
      const m = GameDataManager.createWithCustomDefs("napoleonic", {
        customGameConstants: { HEAD_ON_COLLISION_ANGLE_DEGREES: baseAngle / 2 },
      });
      expect(m.getHeadOnCollisionCosineThresholdSquared()).not.toBe(baseCosine);
      expect(eraSingleton.getHeadOnCollisionCosineThresholdSquared()).toBe(
        baseCosine,
      );
    });

    it("treats empty override objects the same as omitted (still singleton)", () => {
      const a = GameDataManager.createWithCustomDefs("napoleonic", {
        customGameConstants: {},
        customGameRules: {},
      });
      expect(a).toBe(GameDataManager.get("napoleonic"));
    });
  });
});
