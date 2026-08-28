import {
  GameDataManager,
  STAT_PRECISION_SCALE,
} from "@lob-sdk/game-data-manager";

describe("Napoleonic balance", () => {
  const gameDataManager = GameDataManager.get("napoleonic");

  it("uses the 1.7.1 cavalry movement and pushing values", () => {
    const expectedByName = {
      hussars: {
        timeToRun: 4,
        rotationSpeed: 0.37,
        runRotationSpeed: 0.34,
        pushStrength: 12,
        pushDistance: 0.8,
      },
      lancers: {
        timeToRun: 4,
        rotationSpeed: 0.37,
        runRotationSpeed: 0.3,
        pushStrength: 12,
        pushDistance: 0.8,
      },
      horse_archers: {
        timeToRun: 4,
        rotationSpeed: 0.37,
        runRotationSpeed: 0.34,
        pushStrength: 12,
        pushDistance: 0.8,
      },
      dragoons: {
        timeToRun: 4,
        rotationSpeed: 0.35,
        runRotationSpeed: 0.27,
        pushStrength: 16,
        pushDistance: 1,
      },
      cuirassiers: {
        timeToRun: 4,
        rotationSpeed: 0.33,
        runRotationSpeed: 0.25,
        pushStrength: 20,
        pushDistance: 1.2,
      },
    };

    const unitTemplates = gameDataManager
      .getUnitTemplateManager()
      .getTemplates();

    for (const [name, expected] of Object.entries(expectedByName)) {
      const unit = unitTemplates.find((template) => template.name === name);

      expect(unit).toMatchObject(expected);
    }
  });

  it("gives skirmish infantry 80% resistance to the included artillery shot", () => {
    const includedDamageTypes = [
      "12lb-cannon-ball",
      "12lb-canister-fire",
      "8lb-cannon-ball",
      "8lb-canister-fire",
      "6lb-cannon-ball",
      "6lb-canister-fire",
      "4lb-cannon-ball",
      "4lb-canister-fire",
    ];

    for (const damageType of includedDamageTypes) {
      expect(
        gameDataManager.getUnitCategoryResistance(
          "skirmishInfantry",
          damageType,
        ),
      ).toBe(0.8);
    }

    const excludedDamageTypes = [
      "18lb-explosive-shell",
      "18lb-cannon-ball",
      "18lb-canister-fire",
      "10lb-explosive-shell",
      "10lb-cannon-ball",
      "10lb-canister-fire",
      "explosive-shell",
      "howitzer-canister",
      "rocket",
    ];

    for (const damageType of excludedDamageTypes) {
      expect(
        gameDataManager.getUnitCategoryResistance(
          "skirmishInfantry",
          damageType,
        ),
      ).not.toBe(0.8);
    }
  });

  it("uses a 450 organization damage ratio for skirmisher and rifle fire", () => {
    for (const damageType of ["marksman-musket", "rifle"]) {
      const { orgDamageRatio } =
        gameDataManager.getDamageTypeByName(damageType);

      expect(orgDamageRatio / STAT_PRECISION_SCALE).toBe(450);
    }
  });
});
