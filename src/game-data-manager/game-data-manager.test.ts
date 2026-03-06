import { GameDataManager } from "@lob-sdk/game-data-manager";
import { UnitType, TerrainType } from "@lob-sdk/types";
import { DamageTypeTemplate } from "@lob-sdk/game-data-manager";
import { generateDefaultArmy } from "@lob-sdk/army-deployer";

describe("GameDataManager", () => {
  const gameDataManager = GameDataManager.get("napoleonic");

  describe("getBattleType", () => {
    describe("default armies respect unit caps from battle-types.json", () => {
      const battleTypes = gameDataManager.getAllDynamicBattleTypes();

      battleTypes.forEach((battleType) => {
        it(`default army for ${battleType} respects unit caps`, () => {
          const battleTypeConfig = gameDataManager.getBattleType(battleType);
          const defaultArmy = generateDefaultArmy(gameDataManager, battleType);

          // Check each unit type in the default army against its cap
          Object.entries(defaultArmy.units).forEach(([unitTypeStr, count]) => {
            const unitType: UnitType = Number(unitTypeStr);
            const unitCap = battleTypeConfig.unitCaps[unitType];

            if (unitCap !== undefined) {
              expect(count).toBeLessThanOrEqual(unitCap);
            }
          });
        });
      });
    });

    describe("DEFAULT_BATTLE_TYPE exists for all eras", () => {
      const eras = GameDataManager.getAvailableEras();

      eras.forEach((era) => {
        it(`DEFAULT_BATTLE_TYPE exists in getBattleType for ${era} era`, () => {
          const eraGameDataManager = GameDataManager.get(era);
          const gameConstants = eraGameDataManager.getGameConstants();
          const defaultBattleType = gameConstants.DEFAULT_BATTLE_TYPE;

          // Verify that getBattleType doesn't throw an error
          expect(() => {
            eraGameDataManager.getBattleType(defaultBattleType);
          }).not.toThrow();

          // Verify that the battle type is actually returned
          const battleType = eraGameDataManager.getBattleType(defaultBattleType);
          expect(battleType).toBeDefined();
        });
      });
    });

    describe("all mapSizes in battle types exist in mapSizes", () => {
      const eras = GameDataManager.getAvailableEras();

      eras.forEach((era) => {
        it(`all mapSizes from battle types exist in mapSizes for ${era} era`, () => {
          const eraGameDataManager = GameDataManager.get(era);
          const mapSizes = eraGameDataManager.getMapSizes();
          const battleTypes = eraGameDataManager.getAllDynamicBattleTypes();

          battleTypes.forEach((battleType) => {
            const battleTypeConfig = eraGameDataManager.getBattleType(battleType);

            // Verify that all mapSize values in the array exist in mapSizes
            battleTypeConfig.mapSize.forEach((mapSize, index) => {
              const mapSizeValue = mapSize as string;
              expect(mapSizes).toHaveProperty(mapSizeValue);
              expect(mapSizeValue in mapSizes).toBe(true);
              expect(
                mapSizes[mapSizeValue as keyof typeof mapSizes]
              ).toBeDefined();
            });
          });
        });
      });
    });
  });

  describe("Damage Type Methods", () => {
    describe("damageTypeNameToId mapping", () => {
      it("should map every DamageType to its corresponding id", () => {
        const ids = new Set<number>();
        const damageTypes = gameDataManager.getDamageTypes();

        damageTypes.forEach((type) => {
          const id = gameDataManager.damageTypeNameToId(type.name);
          expect(id).toBeDefined();
          expect(typeof id).toBe("number");

          ids.add(id);
        });

        expect(ids.size).toBe(damageTypes.length);
      });
    });

    describe("bidirectional mapping consistency", () => {
      it("should maintain consistency between typeToNumeric and numericToType", () => {
        const damageTypes = gameDataManager.getDamageTypes();
        damageTypes.forEach((type) => {
          const id = gameDataManager.damageTypeNameToId(type.name);
          const backToName = gameDataManager.damageTypeIdToName(id);
          expect(backToName).toBe(type.name);
        });
      });

      describe("damage type retrieval", () => {
        it("should return defined damage type templates for all damage types", () => {
          const types = gameDataManager.getDamageTypes();

          types.forEach((type) => {
            const damageTypeTemplate =
              gameDataManager.getDamageTypeByName<DamageTypeTemplate>(
                type.name
              );
            expect(damageTypeTemplate).toBeDefined();
          });
        });
      });
    });
  });

  describe("Unit Skins", () => {
    it("should not have repeated skin ids", () => {
      const ids = new Set<number>();
      const skins = gameDataManager.getUnitSkins();

      skins.forEach((skin) => {
        expect(ids.has(skin.id)).toBe(false);
        ids.add(skin.id);
      });
    });

    it("should not have undefined formations in any unit skin", () => {
      const skins = gameDataManager.getUnitSkins();

      skins.forEach((skin) => {
        // Check that formations object exists
        expect(skin.formations).toBeDefined();
        expect(skin.formations).not.toBeNull();

        // Check that formations is an object
        expect(typeof skin.formations).toBe("object");

        // Check each formation in the formations object
        Object.entries(skin.formations).forEach(([formationId, formation]) => {
          // Check that formation is not undefined
          expect(formation).toBeDefined();
          expect(formation).not.toBeNull();

          // Check that formation is an object
          expect(typeof formation).toBe("object");

          // Check that formation has valid structure
          if (formation.base) {
            expect(formation.base).toBeDefined();
            expect(typeof formation.base).toBe("string");
          }

          if (formation.overlay !== undefined && formation.overlay !== null) {
            expect(typeof formation.overlay).toBe("string");
          }
        });
      });
    });
  });

  describe("Avatars", () => {
    it("should not have repeated avatar ids", () => {
      const ids = new Set<number>();
      const avatars = gameDataManager.getAvatars();

      avatars.forEach((avatar) => {
        expect(ids.has(avatar.id)).toBe(false);
        ids.add(avatar.id);
      });
    });
  });

  describe("Terrain Methods", () => {
    const terrains = Object.values(TerrainType).filter(
      (value) => typeof value === "number"
    );

    terrains.forEach((type) => {
      it(`should have a config for terrain ${type}`, () => {
        const terrains = gameDataManager.getTerrains();
        const terrain = terrains[type];
        expect(terrain).toBeDefined();
      });
    });

    it("should have all terrain types from TerrainType enum", () => {
      const allTerrainTypes = Object.values(TerrainType).filter(
        (value) => typeof value === "number"
      ) as TerrainType[];

      const terrains = gameDataManager.getTerrains();
      allTerrainTypes.forEach((terrainType) => {
        const terrain = terrains[terrainType];
        expect(terrain).toBeDefined();
      });

      // Verify we have exactly the same number of terrains as defined in the enum
      expect(Object.values(terrains).length).toBe(allTerrainTypes.length);
    });

    it("should not have any extra terrain types beyond the enum", () => {
      const allTerrainTypes = Object.values(TerrainType).filter(
        (value) => typeof value === "number"
      ) as TerrainType[];

      const terrains = gameDataManager.getTerrains();
      // Check that every terrain in the service exists in the enum
      Object.values(terrains).forEach((terrain) => {
        expect(allTerrainTypes).toContain(terrain.id);
      });
    });

    it("should expand wildcard '*' in terrain modifiers to all unit categories", () => {
      const terrainCategories = gameDataManager.getTerrainCategories();
      const unitCategories = gameDataManager.getUnitCategories();

      // Check deepWater category (pure wildcard)
      const deepWater = terrainCategories.deepWater;
      expect(deepWater).toBeDefined();
      if (deepWater && deepWater.movementModifier) {
        // All unit categories should have the -10 modifier
        unitCategories.forEach((category) => {
          expect(deepWater.movementModifier![category.id]).toBe(-10);
        });
        // Wildcard remains in the map for better JIT optimization
        expect("*" in deepWater.movementModifier).toBe(true);
      }

      // Check path category (wildcard + explicit overrides)
      const path = terrainCategories.path;
      expect(path).toBeDefined();
      if (path && path.movementModifier) {
        // Overridden categories
        expect(path.movementModifier.midCavalry).toBe(0.2);
        expect(path.movementModifier.heavyCavalry).toBe(0.2);
        
        // Inherited categories
        expect(path.movementModifier.infantry).toBe(0.3);
        expect(path.movementModifier.artillery).toBe(0.3);
      }
    });
  });

  describe("getSupplyMovementModifier", () => {
    describe("WW2 era", () => {
      const ww2DataManager = GameDataManager.get("ww2");

      it("should return 0 when supply is at maximum (1.0 proportion)", () => {
        const modifier = ww2DataManager.getSupplyMovementModifier(
          "armored",
          100,
          100
        );
        expect(modifier).toBeCloseTo(0);
      });

      it("should return the full penalty when supply is 0", () => {
        const modifier = ww2DataManager.getSupplyMovementModifier(
          "armored",
          0,
          100
        );
        // WW2 armored penalty is -0.5
        expect(modifier).toBe(-0.5);
      });

      it("should scale linearly for partial supply", () => {
        const modifier = ww2DataManager.getSupplyMovementModifier(
          "armored",
          50,
          100
        );
        // (1 - 50/100) * -0.5 = 0.5 * -0.5 = -0.25
        expect(modifier).toBe(-0.25);
      });

      it("should return 0 for categories without penalty", () => {
        const modifier = ww2DataManager.getSupplyMovementModifier(
          "infantry",
          0,
          100
        );
        expect(modifier).toBeCloseTo(0);
      });
    });

    describe("Napoleonic era", () => {
      const napoleonicDataManager = GameDataManager.get("napoleonic");

      it("should return 0 since Napoleonic era has no movement penalties defined", () => {
        const modifier = napoleonicDataManager.getSupplyMovementModifier(
          "infantry",
          0,
          100
        );
        expect(modifier).toBeCloseTo(0);
      });
    });

    describe("Edge Cases", () => {
      const ww2DataManager = GameDataManager.get("ww2");

      it("should return 0 if supply is null", () => {
        const modifier = ww2DataManager.getSupplyMovementModifier(
          "armored",
          null,
          100
        );
        expect(modifier).toBeCloseTo(0);
      });

      it("should return 0 if maxSupply is null", () => {
        const modifier = ww2DataManager.getSupplyMovementModifier(
          "armored",
          50,
          null
        );
        expect(modifier).toBeCloseTo(0);
      });

      it("should return 0 if maxSupply is 0", () => {
        const modifier = ww2DataManager.getSupplyMovementModifier(
          "armored",
          50,
          0
        );
        expect(modifier).toBeCloseTo(0);
      });
    });
  });
});
