import {
  GameDataManager,
  STAT_PRECISION_SCALE,
} from "@lob-sdk/game-data-manager";
import type { RangedDamageTypeTemplate } from "@lob-sdk/game-data-manager/types";

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

  it("uses the 1.7.4 ammo received per 25 unspent gold", () => {
    const ammoPer25Gold = {
      micro: 200,
      clash: 190,
      combat: 180,
      battle: 170,
      grand_battle: 160,
    } as const;

    for (const [battleType, expectedAmmo] of Object.entries(ammoPer25Gold)) {
      expect(
        (25 * gameDataManager.getGoldToAmmoRate(battleType)) /
          STAT_PRECISION_SCALE,
      ).toBe(expectedAmmo);
    }
  });

  it("uses the requested artillery canister and long-range field-gun balance", () => {
    const canisterNames = [
      "18lb-canister-fire",
      "12lb-canister-fire",
      "10lb-canister-fire",
      "8lb-canister-fire",
      "6lb-canister-fire",
      "4lb-canister-fire",
    ];

    for (const name of canisterNames) {
      const canister =
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name);

      expect(canister.orgDamageRatio / STAT_PRECISION_SCALE).toBe(285);
    }

    expect(
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
        "howitzer-canister",
      ).orgDamageRatio / STAT_PRECISION_SCALE,
    ).toBe(320);

    const normalCanisterAmmo = {
      "12lb-canister-fire": 193,
      "8lb-canister-fire": 187,
      "6lb-canister-fire": 180,
      "4lb-canister-fire": 175,
    };

    for (const [name, ammoCost] of Object.entries(normalCanisterAmmo)) {
      const canister =
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name);

      expect(canister.ammoCost! / STAT_PRECISION_SCALE).toBe(ammoCost);
      expect(canister.ranges).toMatchObject([
        {
          name: "close",
          damageModifier: { near: 3.5, far: 2.7 },
        },
        {
          name: "long",
          damageModifier: { near: 2.2, far: 1 },
        },
      ]);
    }

    expect(
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
        "18lb-canister-fire",
      ).ammoCost! / STAT_PRECISION_SCALE,
    ).toBe(193);
    expect(
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
        "10lb-canister-fire",
      ).ammoCost! / STAT_PRECISION_SCALE,
    ).toBe(187);
    expect(
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
        "howitzer-canister",
      ).ammoCost! / STAT_PRECISION_SCALE,
    ).toBe(197);

    for (const name of [
      "12lb-cannon-ball",
      "8lb-cannon-ball",
      "6lb-cannon-ball",
      "4lb-cannon-ball",
    ]) {
      const cannonBall =
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name);
      const longRange = cannonBall.ranges.find((range) => range.name === "long");

      expect(longRange).toMatchObject({
        damageModifier: { near: 0.25, far: -0.65 },
        orgDamageModifier: { near: 0.24, far: 0.31 },
      });
    }
  });

  it("uses eight-gun tallies and 100 push strength for combat artillery", () => {
    const artilleryNames = [
      "8lb_artillery",
      "6lb_artillery_horse",
      "6in_howitzer",
      "12lb_artillery",
      "4lb_artillery",
      "6lb_artillery",
      "rockets",
      "10lb_licorne",
      "18lb_licorne",
    ];
    const artillery = gameDataManager
      .getUnitTemplateManager()
      .getTemplates()
      .filter((template) => artilleryNames.includes(template.name));

    expect(artillery).toHaveLength(artilleryNames.length);
    for (const unit of artillery) {
      expect(unit.pushStrength).toBe(100);
      expect(unit.reportStats!.guns).toBe(unit.name === "rockets" ? 6 : 8);
    }
  });

  it("uses the requested Licorne shell balance", () => {
    const tenPound =
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
        "10lb-explosive-shell",
      );
    const eighteenPound =
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
        "18lb-explosive-shell",
      );

    expect(tenPound.reorgDebuff).toBe(0.85);
    expect(tenPound.areaOfEffect).toMatchObject({
      edgeDamageModifier: -0.65,
      ranges: [{ startRadius: 32, endRadius: 38 }],
    });
    expect(eighteenPound.areaOfEffect).toMatchObject({
      edgeDamageModifier: -0.7,
    });
  });

  it("uses the requested infantry, column, and cavalry charge balance", () => {
    const unitTemplates = gameDataManager
      .getUnitTemplateManager()
      .getTemplates();
    const expectedInfantry = [
      "line_infantry",
      "guards",
      "light_infantry",
      "militia",
      "grenadiers",
      "skirmishers",
      "rifles",
    ];

    for (const name of expectedInfantry) {
      const unit = unitTemplates.find((template) => template.name === name);

      expect(unit?.flankChargePenBonus).toBe(0.25);
    }

    expect(
      unitTemplates.find((template) => template.name === "grenadiers")
        ?.chargePenetration,
    ).toBe(0.9);

    expect(
      gameDataManager.getFormationManager().getTemplate("column"),
    ).toMatchObject({
      chargeResistanceModifier: 0.1,
      rangedOrgResistance: 0.3,
      receivedMeleeDamageModifier: 0,
    });

    for (const category of [
      "midCavalry",
      "scoutCavalry",
      "lightCavalry",
      "heavyCavalry",
    ]) {
      const cavalry = gameDataManager.getUnitCategoryTemplate(category);

      expect(cavalry.damageTypeResistances?.bayonet).toBe(-0.25);
      expect(cavalry.chargeStaminaCost! / STAT_PRECISION_SCALE).toBe(25);
    }
  });
});
