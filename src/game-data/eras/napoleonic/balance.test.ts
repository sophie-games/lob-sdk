import {
  GameDataManager,
  STAT_PRECISION_SCALE,
} from "@lob-sdk/game-data-manager";
import type { RangedDamageTypeTemplate } from "@lob-sdk/game-data-manager/types";
import { OrderType, TerrainType } from "@lob-sdk/types";

describe("Napoleonic balance", () => {
  const gameDataManager = GameDataManager.get("napoleonic");

  it("uses 1.7's range curves with 1.8's movement penalties", () => {
    for (const [name, points] of [
      ["musket", [6, 4, 1.5, -0.5, -0.8]],
      ["horse-archer-bow", [2.5, 1.5, 1, 0.5]],
    ] as const) {
      const { ranges } = gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name);
      expect(ranges.map(range => range.damageModifier)).toEqual(
        points.slice(0, -1).map((near, index) => ({ near, far: points[index + 1] })),
      );
    }
    expect(gameDataManager.getRotationSpeedModifier(TerrainType.Road)).toBe(0.75);
    expect(gameDataManager.getGameConstants().HAS_TAKEN_FIRE_SPEED_MODIFIER).toBe(-0.15);
    expect(gameDataManager.getGameRules().organization?.routingOrgRecoveryModifier).toBe(-0.3);
    for (const category of ["midCavalry", "lightCavalry", "scoutCavalry", "heavyCavalry"] as const) {
      expect(gameDataManager.getRunSpeedModifier(TerrainType.Forest, category)).toBe(0);
    }
  });

  it("uses the requested routing-unit organization-radius multiplier", () => {
    expect(
      gameDataManager.getGameRules().organization
        ?.routingUnitNearbyUnitsOrgBonus,
    ).toBe(5);
  });

  it("uses 1.7's organization recovery bands", () => {
    expect(gameDataManager.getGameRules().organization).toMatchObject({
      safeOrgRecoveryModifier: 0.3,
      distantThreatOrgRecoveryModifier: 0.2,
      distantThreatDistance: 72,
    });
  });

  it("spends a unit at half its men, the casualties that wiped it out in 1.7", () => {
    expect(gameDataManager.getGameConstants().SPENT_HP_LOSS_PROPORTION).toBe(0.5);
  });

  it("keeps 1.7's full HP penalties, reached once a unit is spent", () => {
    expect(gameDataManager.getGameConstants().MAX_HP_RANGED_ATTACK_PENALTY).toBe(-0.5);
    expect(gameDataManager.getGameRules().organization).toMatchObject({
      orgRadiusBonusHpLossReduction: 0.6,
      maxOrgRecoveryByHpModifier: -0.99,
    });
  });

  it("never turns a spent unit's organization aura negative", () => {
    // The aura scales by 1 - r * spentProportion, which stays >= 0 for a spent unit only for r <= 1.
    expect(
      gameDataManager.getGameRules().organization?.orgRadiusBonusHpLossReduction,
    ).toBeLessThanOrEqual(1);
  });

  it("uses 1.7's 32-tick initial rout with a -200% organization bonus modifier", () => {
    expect(gameDataManager.getGameRules().organization).toMatchObject({
      startedRoutingDuration: 32,
      startedRoutingOrgRadiusModifier: -2,
      startedRoutingOrgRadiusDistance: 64,
    });
  });

  it("uses 1.7's cavalry rifle, marksman, and canister resistances", () => {
    const canisterNames = [
      "4lb-canister-fire",
      "6lb-canister-fire",
      "8lb-canister-fire",
      "10lb-canister-fire",
      "12lb-canister-fire",
      "18lb-canister-fire",
      "howitzer-canister",
    ];

    for (const [category, resistance] of Object.entries({
      midCavalry: -0.35,
      lightCavalry: -0.3,
      scoutCavalry: -0.4,
      heavyCavalry: -0.35,
    })) {
      for (const damageType of ["rifle", "marksman-musket"]) {
        expect(
          gameDataManager.getUnitCategoryResistance(category, damageType),
        ).toBe(resistance);
      }
      for (const damageType of canisterNames) {
        expect(
          gameDataManager.getUnitCategoryResistance(category, damageType),
        ).toBe(-0.4);
      }
    }
  });

  it("uses 1.7's cavalry cannonball and shell resistances and artillery shell resistances", () => {
    const shells = ["explosive-shell", "10lb-explosive-shell", "18lb-explosive-shell"];
    const cannonballs = ["4lb", "6lb", "8lb", "10lb", "12lb", "18lb"].map(
      (weight) => `${weight}-cannon-ball`,
    );
    for (const [category, resistance] of Object.entries({
      midCavalry: 0.15,
      lightCavalry: 0.15,
      scoutCavalry: 0.2,
      heavyCavalry: 0.15,
    })) {
      for (const damageType of [...cannonballs, ...shells]) {
        expect(gameDataManager.getUnitCategoryResistance(category, damageType)).toBe(resistance);
      }
    }
    for (const [damageType, resistance] of Object.entries({
      "explosive-shell": 0.55,
      "10lb-explosive-shell": 0.45,
      "18lb-explosive-shell": 0.45,
    })) {
      expect(gameDataManager.getUnitCategoryResistance("artillery", damageType)).toBe(resistance);
    }
  });

  it("uses 1.7's stamina recovery and Fire and Advance damage with 1.8's order speeds", () => {
    expect(gameDataManager.getGameRules().stamina?.regainRates).toEqual({
      range1: 4000,
      range2: 6000,
      range3: 7000,
      range4: 6000,
      range5: 3000,
    });

    const fireAndAdvance = gameDataManager.getOrderTemplate(
      OrderType.FireAndAdvance,
    );
    expect(fireAndAdvance).toMatchObject({
      orgRegainModifier: -0.15,
      speedModifierWhenShooting: -0.2,
      speedModifierWhenShootingByCategory: {
        infantry: -0.2,
        guardsInfantry: -0.2,
        skirmishInfantry: -0.2,
        militiaInfantry: -0.2,
        artillery: -0.2,
      },
      rangedDamageModifierByCategory: {
        infantry: -0.2,
        guardsInfantry: -0.2,
        skirmishInfantry: -0.2,
        militiaInfantry: -0.2,
        artillery: -0.4,
      },
    });
    expect(fireAndAdvance.rangedDamageModifier).toBeUndefined();

    expect(gameDataManager.getOrderTemplate(OrderType.Fallback)).toMatchObject({
      speedModifier: -0.6,
      speedModifierByCategory: {
        infantry: -0.35,
        guardsInfantry: -0.35,
        skirmishInfantry: -0.35,
        militiaInfantry: -0.35,
        artillery: -0.55,
      },
    });
  });

  it("uses 1.7's cavalry turning and pushing values", () => {
    const expectedByName = {
      hussars: {
        rotationSpeed: 0.37,
        runRotationSpeed: 0.34,
        pushStrength: 12,
        pushDistance: 0.8,
      },
      lancers: {
        rotationSpeed: 0.37,
        runRotationSpeed: 0.3,
        pushStrength: 12,
        pushDistance: 0.8,
      },
      horse_archers: {
        rotationSpeed: 0.37,
        runRotationSpeed: 0.34,
        pushStrength: 12,
        pushDistance: 0.8,
      },
      dragoons: {
        rotationSpeed: 0.35,
        runRotationSpeed: 0.27,
        pushStrength: 16,
        pushDistance: 1,
      },
      cuirassiers: {
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

  it("gives skirmish infantry the requested 80% artillery shot resistance", () => {
    const includedDamageTypes = [
      "18lb-cannon-ball",
      "18lb-canister-fire",
      "12lb-cannon-ball",
      "12lb-canister-fire",
      "10lb-cannon-ball",
      "10lb-canister-fire",
      "8lb-cannon-ball",
      "8lb-canister-fire",
      "6lb-cannon-ball",
      "6lb-canister-fire",
      "4lb-cannon-ball",
      "4lb-canister-fire",
      "howitzer-canister",
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
      "10lb-explosive-shell",
      "explosive-shell",
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

  it("limits skirmishers to a 120-degree firing arc", () => {
    const skirmish = gameDataManager
      .getFormationManager()
      .getTemplate("skirmish");

    expect(skirmish?.fireEdges).toEqual([{ edge: 1, arc: 120, emitters: 2 }]);
  });

  it("uses a 900 organization damage ratio for skirmisher and rifle fire", () => {
    for (const damageType of ["marksman-musket", "rifle"]) {
      const { orgDamageRatio } =
        gameDataManager.getDamageTypeByName(damageType);

      expect(orgDamageRatio / STAT_PRECISION_SCALE).toBe(900);
    }
  });

  it("uses the 1.7.5 ammo received per 25 unspent gold", () => {
    const ammoPer25Gold = {
      micro: 300,
      clash: 275,
      combat: 250,
      battle: 225,
      grand_battle: 200,
    } as const;

    for (const [battleType, expectedAmmo] of Object.entries(ammoPer25Gold)) {
      expect(
        (25 * gameDataManager.getGoldToAmmoRate(battleType)) /
          STAT_PRECISION_SCALE,
      ).toBe(expectedAmmo);
    }
  });

  it("uses 1.7's universal ammo reserves", () => {
    const ammoReserveByBattleType = {
      micro: 500,
      clash: 1000,
      combat: 2000,
      battle: 3000,
      grand_battle: 4800,
    } as const;

    for (const [battleType, expectedAmmo] of Object.entries(
      ammoReserveByBattleType,
    )) {
      expect(
        gameDataManager.getAmmoReserve(battleType) / STAT_PRECISION_SCALE,
      ).toBe(expectedAmmo);
    }
  });

  it("uses 1.7's artillery ammo costs", () => {
    const ammoCostByName = {
      "18lb-cannon-ball": 103,
      "12lb-cannon-ball": 100,
      "10lb-cannon-ball": 103,
      "8lb-cannon-ball": 103,
      "6lb-cannon-ball": 100,
      "4lb-cannon-ball": 103,
      "18lb-canister-fire": 193,
      "12lb-canister-fire": 193,
      "10lb-canister-fire": 187,
      "8lb-canister-fire": 187,
      "6lb-canister-fire": 180,
      "4lb-canister-fire": 175,
      "howitzer-canister": 197,
      "18lb-explosive-shell": 103,
      "10lb-explosive-shell": 103,
      "explosive-shell": 120,
    };

    for (const [name, ammoCost] of Object.entries(ammoCostByName)) {
      expect(
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name)
          .ammoCost! / STAT_PRECISION_SCALE,
      ).toBe(ammoCost);
    }
  });

  it("uses 1.7's artillery damage ratios and field-gun ranges, ratios doubled with HP", () => {
    for (const name of [
      "18lb-canister-fire",
      "12lb-canister-fire",
      "10lb-canister-fire",
      "8lb-canister-fire",
      "6lb-canister-fire",
      "4lb-canister-fire",
      "howitzer-canister",
    ]) {
      const canister =
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name);

      expect(canister.orgDamageRatio / STAT_PRECISION_SCALE).toBe(
        name === "howitzer-canister" ? 640 : 570,
      );
    }

    for (const name of [
      "18lb-cannon-ball",
      "12lb-cannon-ball",
      "10lb-cannon-ball",
      "8lb-cannon-ball",
      "6lb-cannon-ball",
      "4lb-cannon-ball",
    ]) {
      const cannonBall =
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name);

      expect(cannonBall.orgDamageRatio / STAT_PRECISION_SCALE).toBe(420);
    }

    for (const name of [
      "12lb-canister-fire",
      "8lb-canister-fire",
      "6lb-canister-fire",
      "4lb-canister-fire",
    ]) {
      const canister =
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name);

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

    for (const name of [
      "12lb-cannon-ball",
      "8lb-cannon-ball",
      "6lb-cannon-ball",
      "4lb-cannon-ball",
    ]) {
      const cannonBall =
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name);
      const longRange = cannonBall.ranges.find(
        (range) => range.name === "long",
      );

      expect(longRange).toMatchObject({
        damageModifier: { near: 0.25, far: -0.65 },
        orgDamageModifier: { near: 0.24, far: 0.31 },
      });
    }
  });

  it("uses 1.7's artillery combat values with 1.8's artillery movement", () => {
    const expectedByName = {
      "8lb_artillery": { runMovement: 80, rotationSpeed: 0.26, guns: 8 },
      "6lb_artillery_horse": {
        manpower: 100,
        rangedAttack: 3100,
        hp: 140000,
        runMovement: 150,
        timeToRun: 9,
        guns: 8,
      },
      "6in_howitzer": {
        rangedAttack: 2500,
        rotationSpeed: 0.31,
        panicFireDistance: 69,
        guns: 8,
      },
      "12lb_artillery": { runMovement: 80, guns: 8 },
      "4lb_artillery": { manpower: 75, rangedAttack: 2800, gold: 100, guns: 8 },
      "6lb_artillery": { runMovement: 85, hp: 140000, guns: 8 },
      rockets: { runMovement: 150, guns: 6 },
      "10lb_licorne": {
        rangedAttack: 3400,
        runMovement: 85,
        hp: 140000,
        guns: 8,
      },
      "18lb_licorne": {
        rangedAttack: 3900,
        runMovement: 80,
        hp: 160000,
        guns: 8,
      },
    } as const;
    const unitTemplates = gameDataManager
      .getUnitTemplateManager()
      .getTemplates();

    for (const [name, { guns, ...expected }] of Object.entries(
      expectedByName,
    )) {
      const unit = unitTemplates.find((template) => template.name === name)!;

      expect(unit).toMatchObject(expected);
      expect(unit.pushStrength).toBe(100);
      expect(unit.reportStats!.guns).toBe(guns);
    }
  });

  it("uses the requested artillery rotation speeds in degrees", () => {
    const expectedDegrees = {
      "18lb_licorne": 12,
      "12lb_artillery": 12,
      "8lb_artillery": 15,
      "10lb_licorne": 15,
      "6lb_artillery": 18,
      "4lb_artillery": 18,
      "6in_howitzer": 18,
      "6lb_artillery_horse": 18,
    };
    const templates = gameDataManager.getUnitTemplateManager().getTemplates();

    for (const [name, degrees] of Object.entries(expectedDegrees)) {
      const unit = templates.find((template) => template.name === name)!;

      expect(Math.round((unit.rotationSpeed * 180) / Math.PI)).toBe(degrees);
    }
  });

  it("uses 1.7's rocket balance", () => {
    const rocket =
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>("rocket");

    expect(rocket.projectilePenetration).toBe(0.4);
    expect(rocket.areaOfEffect).toMatchObject({
      edgeDamageModifier: 0.8,
      absorptionModifier: 1.25,
    });
  });

  it("uses 1.7's Licorne damage curves", () => {
    for (const weight of ["10lb", "18lb"]) {
      const shell =
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
          `${weight}-explosive-shell`,
        );
      const cannonBall =
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
          `${weight}-cannon-ball`,
        );
      const canister =
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
          `${weight}-canister-fire`,
        );

      expect(shell.ranges).toMatchObject([
        {
          damageModifier: {
            near: -0.05,
            far: weight === "18lb" ? -0.45 : -0.35,
          },
        },
      ]);
      expect(cannonBall.ranges).toMatchObject([
        { damageModifier: { near: 0.9, far: 0.4 } },
      ]);
      expect(canister.ranges).toMatchObject([
        {
          name: "close",
          damageModifier: { near: 3.5, far: 2.8 },
        },
        { name: "long", damageModifier: { near: 2.2, far: 1.8 } },
      ]);
    }
  });

  it("uses 1.7's howitzer damage balance", () => {
    const shell =
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
        "explosive-shell",
      );
    const licorneShell =
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
        "18lb-explosive-shell",
      );
    const canister =
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
        "howitzer-canister",
      );

    expect(shell.orgDamageRatio / STAT_PRECISION_SCALE).toBe(450);
    // The HP band moved with the HP doubling, so it starts at 95% instead of 1.7's 90%.
    expect(shell.damageModifierByTargetHp).toEqual({ from: 0.95, to: 0.75, value: -0.1 });
    expect(shell.orgDamageModifierByTargetOrg).toEqual({ from: 0.9, to: 0.6, value: -0.15 });
    expect(shell.ranges).toMatchObject([
      { from: 0.2, to: 0.5882, damageModifier: { near: 0.15, far: 0 } },
      { from: 0.5882, to: 1, damageModifier: { near: 0, far: -0.3 }, name: "long" },
    ]);
    expect(shell.areaOfEffect).toMatchObject({
      edgeDamageModifier: -0.6,
      absorptionModifier: 0,
      ranges: [
        { start: 69, end: 200, startRadius: 30, endRadius: 32 },
        { start: 200, end: 340, startRadius: 32, endRadius: 34 },
      ],
    });
    expect(licorneShell.areaOfEffect?.absorptionModifier).toBe(1.25);
    expect(canister).toMatchObject({
      maxRange: 69,
      ranges: [{ damageModifier: { near: 8, far: 6.65 } }],
    });
  });

  it("uses 1.7's formation combat values with 1.8's formation movement", () => {
    const unitTemplates = gameDataManager
      .getUnitTemplateManager()
      .getTemplates();

    expect(
      unitTemplates.find((template) => template.name === "militia")
        ?.chargeResistance,
    ).toBe(0.2);
    expect(
      gameDataManager.getFormationManager().getTemplate("column"),
    ).toMatchObject({
      movementModifier: 0,
      runMovementModifier: 0,
      fireEdges: [{ edge: 1, arc: 40, emitters: 1 }],
      rangedAttackModifier: -0.8,
      flankChargeResistance: -0.6,
    });
    const line = gameDataManager.getFormationManager().getTemplate("line");
    const square = gameDataManager.getFormationManager().getTemplate("square");

    expect(line).toMatchObject({
      movementModifier: -0.25,
      fireEdges: [{ edge: 1, arc: 40, emitters: 4 }],
      runMovementModifier: -0.25,
      flankChargeResistance: -0.6,
    });
    expect(line?.rangedAttackModifier).toBe(1);
    expect(line?.formingSpeedModifier).toBe(-1);
    expect(square?.formingSpeedModifier).toBe(-1);
    expect(square).toMatchObject({
      movementModifier: -0.75,
      runMovementModifier: -0.75,
      pushStrengthModifier: -0.5,
      receivedMeleeDamageModifier: 0.05,
      chargeResistanceModifier: 0.3,
    });
    expect(square?.rangedAttackModifier).toBe(1.5);
    expect(square?.rangedDamageResistance).toBe(-0.4);
    expect(square?.minMovementModifier).toBe(-0.9);
    expect(square?.rangedOrgResistance).toBe(0.2);

    // Guards and Light Infantry form the same square as the rest of the line.
    expect(
      gameDataManager.getFormationManager().getTemplate("elite-square"),
    ).toBeNull();
    for (const name of ["guards", "light_infantry"]) {
      const unit = unitTemplates.find((template) => template.name === name)!;

      expect(unit.formations.map((formation) => formation.id)).toEqual([
        "column",
        "line",
        "square",
      ]);
    }
    expect(
      gameDataManager.getFormationManager().getTemplate("cavalry"),
    ).toMatchObject({
      minMovementModifier: -0.85,
      flankChargeResistance: -0.2,
    });
    expect(
      gameDataManager.getFormationManager().getTemplate("artillery"),
    ).toMatchObject({ minMovementModifier: -0.5 });
  });

  it("uses 1.7's elite infantry balance", () => {
    const expectedByName = {
      guards: {
        org: 950,
        chargeResistance: 0.5,
        meleeAttack: 48,
        orgRadiusBonus: 13,
      },
      grenadiers: { org: 725, chargeResistance: 0.55 },
    } as const;
    const unitTemplates = gameDataManager
      .getUnitTemplateManager()
      .getTemplates();

    for (const [name, expected] of Object.entries(expectedByName)) {
      const unit = unitTemplates.find((template) => template.name === name)!;

      expect(unit.org / STAT_PRECISION_SCALE).toBe(expected.org);
      expect(unit.chargeResistance).toBe(expected.chargeResistance);

      if ("meleeAttack" in expected) {
        expect(unit.meleeAttack / STAT_PRECISION_SCALE).toBe(
          expected.meleeAttack,
        );
        expect(unit.orgRadiusBonus! / STAT_PRECISION_SCALE).toBe(
          expected.orgRadiusBonus,
        );
      }
    }
  });

  it("uses the requested light infantry attack and organization", () => {
    const lightInfantry = gameDataManager
      .getUnitTemplateManager()
      .getTemplates()
      .find((template) => template.name === "light_infantry")!;

    expect(lightInfantry).toMatchObject({
      rangedAttack: 20 * STAT_PRECISION_SCALE,
      org: 725 * STAT_PRECISION_SCALE,
    });
  });

  it("uses 1.7's infantry attacks with 1.8's marching speeds", () => {
    const expectedByName = {
      line_infantry: { rangedAttack: 1700, meleeAttack: 4600, chargeBonus: 5500, runMovement: 125 },
      guards: { rangedAttack: 1900, meleeAttack: 4800, chargeBonus: 6000, runMovement: 130 },
      light_infantry: { rangedAttack: 2000, meleeAttack: 4600, chargeBonus: 5500, runMovement: 140, skirmisherRatio: 1.15, walkMovement: 85 },
      militia: { rangedAttack: 1400, meleeAttack: 2700, chargeBonus: 5500, runMovement: 125 },
      grenadiers: { rangedAttack: 1800, meleeAttack: 5400, chargeBonus: 6500, runMovement: 130 },
      // 1.7's 150 HP, doubled with every unit's.
      skirmishers: {
        walkMovement: 85,
        hp: 30000,
        org: 70000,
        rangedAttack: 1100,
        meleeAttack: 3000,
        chargeBonus: 0,
        runMovement: 140,
        chargeResistance: -0.4,
      },
      rifles: {
        walkMovement: 85,
        hp: 30000,
        org: 70000,
        rangedAttack: 1200,
        meleeAttack: 3000,
        chargeBonus: 0,
        runMovement: 140,
        chargeResistance: -0.4,
      },
    } as const;
    const unitTemplates = gameDataManager
      .getUnitTemplateManager()
      .getTemplates();

    for (const [name, expected] of Object.entries(expectedByName)) {
      const unit = unitTemplates.find((template) => template.name === name);

      expect(unit).toMatchObject({ walkMovement: 80, ...expected });
    }

    expect(
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>("musket")
        .ranges[0].damageModifier.near,
    ).toBe(6);
  });

  it("uses 1.7's cavalry charge and organization balance", () => {
    const expectedByName = {
      cuirassiers: {
        org: 950,
        meleeDefense: 3000,
        chargeBonus: 140,
        chargeResistance: 0.35,
        orgRadiusBonus: 9,
        timeToRun: 5,
      },
      lancers: {
        org: 900,
        meleeDefense: 2000,
        chargeBonus: 140,
        chargeResistance: 0.2,
        orgRadiusBonus: 6,
        timeToRun: 5,
      },
      dragoons: {
        meleeDefense: 2800,
        chargeBonus: 125,
        chargeResistance: 0.3,
        orgRadiusBonus: 6,
        org: 850,
        timeToRun: 4,
      },
      hussars: {
        org: 800,
        meleeDefense: 2200,
        chargeBonus: 100,
        chargeResistance: 0.2,
        orgRadiusBonus: 4,
        timeToRun: 3,
      },
      horse_archers: {
        org: 400,
        meleeDefense: 2200,
        chargeBonus: 80,
        chargeResistance: 0.2,
        orgRadiusBonus: 4,
        timeToRun: 3,
      },
    } as const;
    const unitTemplates = gameDataManager
      .getUnitTemplateManager()
      .getTemplates();

    for (const [name, expected] of Object.entries(expectedByName)) {
      const unit = unitTemplates.find((template) => template.name === name)!;

      expect(unit.chargeBonus / STAT_PRECISION_SCALE).toBe(
        expected.chargeBonus,
      );
      expect(unit.orgRadiusBonus! / STAT_PRECISION_SCALE).toBe(
        expected.orgRadiusBonus,
      );
      expect(unit.meleeDefense).toBe(expected.meleeDefense);
      expect(unit.orgRadius).toBe(64);
      expect(unit.timeToRun).toBe(expected.timeToRun);
      expect(unit.chargeResistance).toBe(expected.chargeResistance);

      if (name === "horse_archers") {
        expect(unit.chargePenetration).toBe(0.3);
        expect(unit.meleeAttack / STAT_PRECISION_SCALE).toBe(50);
      }

      if ("org" in expected) {
        expect(unit.org / STAT_PRECISION_SCALE).toBe(expected.org);
      }
    }
  });

  it("keeps 1.7's militia weakness to horse archer bows", () => {
    expect(gameDataManager.getUnitCategoryResistance("militiaInfantry", "horse-archer-bow")).toBe(-1);
  });

  it("gives skirmish infantry full charge resistance in forest and city", () => {
    for (const terrain of [TerrainType.Forest, TerrainType.City]) {
      expect(
        gameDataManager.getChargeResistanceModifier(
          "skirmishInfantry",
          terrain,
        ),
      ).toBe(1);
    }
  });

  it("uses 1.8's shallow water turning with 1.7's skirmisher defense", () => {
    expect(gameDataManager.getRotationSpeedModifier(TerrainType.ShallowWater)).toBe(-0.75);
    expect(
      gameDataManager.getUnitTerrainDefenseModifier("skirmishInfantry", TerrainType.ShallowWater),
    ).toBe(-1);
  });

  it("uses the requested path movement balance on roads and bridges", () => {
    for (const terrain of [TerrainType.Road, TerrainType.Bridge]) {
      for (const [category, movement, run] of [
        ["ship", 0.5, 0],
        ["midCavalry", 0.3, 0.1],
        ["lightCavalry", 0.3, 0.1],
        ["scoutCavalry", 0.3, 0.1],
        ["heavyCavalry", 0.3, 0.1],
        ["artillery", 0.6, 0.6],
        ["infantry", 0.6, 0.3],
        ["guardsInfantry", 0.6, 0.3],
        ["militiaInfantry", 0.6, 0.3],
        ["skirmishInfantry", 0.6, 0.2],
      ] as const) {
        expect(gameDataManager.getMovementModifier(terrain, category)).toBe(movement);
        expect(gameDataManager.getRunSpeedModifier(terrain, category)).toBe(run);
      }
      expect(gameDataManager.getStaminaCost(terrain)).toBe(-0.8);
    }
  });

  it("uses the final forest height and neutral run modifiers for every category", () => {
    expect(gameDataManager.getTerrainHitboxHeight(TerrainType.Forest)).toBe(1.5);
    for (const category of [
      "infantry",
      "guardsInfantry",
      "skirmishInfantry",
      "militiaInfantry",
      "midCavalry",
      "lightCavalry",
      "scoutCavalry",
      "heavyCavalry",
      "artillery",
      "ship",
    ]) {
      expect(
        gameDataManager.getRunSpeedModifier(TerrainType.Forest, category),
      ).toBe(0);
    }
  });

  it("uses 1.7's stamina ranged attack penalty", () => {
    expect(gameDataManager.getGameRules().stamina?.rangedAttackPenalty).toBe(
      -0.15,
    );
  });

  it("uses the requested cavalry musket resistances", () => {
    for (const [category, resistance] of Object.entries({
      midCavalry: -0.35,
      lightCavalry: -0.3,
      scoutCavalry: -0.5,
      heavyCavalry: -0.4,
    })) {
      expect(
        gameDataManager.getUnitCategoryResistance(category, "musket"),
      ).toBe(resistance);
    }
  });

  it("uses 1.7's forest combat values with 1.8's forest movement", () => {
    expect(gameDataManager.getPushStrengthModifier(TerrainType.Forest)).toBe(
      -0.1,
    );
    expect(gameDataManager.getPushDistanceModifier(TerrainType.Forest)).toBe(
      -0.1,
    );
    expect(gameDataManager.getStaminaCost(TerrainType.Forest)).toBe(0.5);
    expect(
      gameDataManager.getMovementModifier(
        TerrainType.Forest,
        "skirmishInfantry",
      ),
    ).toBe(-0.4);

    for (const category of [
      "infantry",
      "guardsInfantry",
      "militiaInfantry",
    ] as const) {
      expect(
        gameDataManager.getMovementModifier(TerrainType.Forest, category),
      ).toBe(-0.5);
    }
    for (const category of [
      "infantry",
      "guardsInfantry",
      "skirmishInfantry",
      "militiaInfantry",
    ] as const) {
      expect(
        gameDataManager.getRunSpeedModifier(TerrainType.Forest, category),
      ).toBe(0);
    }
    for (const category of [
      "midCavalry",
      "lightCavalry",
      "scoutCavalry",
      "heavyCavalry",
    ] as const) {
      expect(
        gameDataManager.getMovementModifier(TerrainType.Forest, category),
      ).toBe(-0.75);
    }

    for (const [category, modifier] of Object.entries({
      artillery: -0.3,
      infantry: -0.25,
      guardsInfantry: -0.25,
      militiaInfantry: -0.2,
    })) {
      expect(
        gameDataManager.getRangedAttackModifier(TerrainType.Forest, category),
      ).toBe(modifier);
    }

    const expectedAbsorption = {
      musket: 0.2,
      "marksman-musket": 0.12,
      rifle: 0.08,
      "horse-archer-bow": 1,
      "4lb-cannon-ball": 0.2,
      "6lb-cannon-ball": 0.2,
      "8lb-cannon-ball": 0.15,
      "10lb-cannon-ball": 0.15,
      "12lb-cannon-ball": 0.12,
      "18lb-cannon-ball": 0.12,
      "4lb-canister-fire": 0.15,
      "6lb-canister-fire": 0.15,
      "8lb-canister-fire": 0.15,
      "10lb-canister-fire": 0.15,
      "12lb-canister-fire": 0.15,
      "18lb-canister-fire": 0.15,
      "howitzer-canister": 0.15,
      "explosive-shell": 0.12,
    } as const;

    for (const [damageType, absorption] of Object.entries(expectedAbsorption)) {
      expect(
        gameDataManager.getTerrainProjectileAbsorption(
          TerrainType.Forest,
          damageType,
        ),
      ).toBe(absorption);
    }
  });

  it("uses 1.7's building combat values with 1.8's building movement", () => {
    expect(gameDataManager.getPushStrengthModifier(TerrainType.Building)).toBe(
      0.2,
    );
    expect(gameDataManager.getPushDistanceModifier(TerrainType.Building)).toBe(
      -0.2,
    );
    expect(
      gameDataManager.getMovementModifier(
        TerrainType.Building,
        "skirmishInfantry",
      ),
    ).toBe(-0.25);
    expect(
      gameDataManager.getMovementModifier(TerrainType.Building, "artillery"),
    ).toBe(-0.35);
    expect(
      gameDataManager.getRangedAttackModifier(
        TerrainType.Building,
        "skirmishInfantry",
      ),
    ).toBe(0);

    for (const [category, modifier] of Object.entries({
      infantry: -0.5,
      guardsInfantry: -0.5,
      militiaInfantry: -0.4,
    })) {
      expect(
        gameDataManager.getRangedAttackModifier(TerrainType.Building, category),
      ).toBe(modifier);
      expect(
        gameDataManager.getUnitTerrainDefenseModifier(category, TerrainType.Building),
      ).toBe(0.8);
    }

    const expectedAbsorption = {
      musket: 0.5,
      "horse-archer-bow": 1,
      "4lb-cannon-ball": 0.6,
      "6lb-cannon-ball": 0.6,
      "8lb-cannon-ball": 0.5,
      "10lb-cannon-ball": 0.5,
      "12lb-cannon-ball": 0.45,
      "18lb-cannon-ball": 0.45,
      "howitzer-canister": 0.04,
      "explosive-shell": 0.25,
      "10lb-explosive-shell": 0.25,
      "18lb-explosive-shell": 0.25,
    } as const;

    for (const [damageType, absorption] of Object.entries(expectedAbsorption)) {
      expect(
        gameDataManager.getTerrainProjectileAbsorption(
          TerrainType.Building,
          damageType,
        ),
      ).toBe(absorption);
    }
  });

  it("uses the requested dispersed formation run speed modifier", () => {
    expect(
      gameDataManager.getFormationManager().getTemplate("dispersed"),
    ).toMatchObject({ runMovementModifier: 1.5 });
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

  it("uses 1.7's militia resistance to cavalry melee", () => {
    for (const damageType of [
      "cavalry-sabre",
      "cavalry-sword",
      "dragoon-sword",
      "cavalry-lance",
    ]) {
      expect(
        gameDataManager.getUnitCategoryResistance("militiaInfantry", damageType),
      ).toBe(-1);
    }
  });

  it("uses 1.7's artillery cannon-ball resistance", () => {
    const resistanceByDamageType = {
      "18lb-cannon-ball": 0.55,
      "12lb-cannon-ball": 0.55,
      "10lb-cannon-ball": 0.6,
      "8lb-cannon-ball": 0.6,
      "6lb-cannon-ball": 0.65,
      "4lb-cannon-ball": 0.7,
    };

    for (const [damageType, expected] of Object.entries(
      resistanceByDamageType,
    )) {
      expect(
        gameDataManager.getUnitCategoryResistance("artillery", damageType),
      ).toBe(expected);
    }
  });

  it("reports 1.7's unit strengths", () => {
    const expectedByName = {
      line_infantry: { men: 800, horse: 0 },
      light_infantry: { men: 800, horse: 0 },
      grenadiers: { men: 800, horse: 0 },
      guards: { men: 800, horse: 0 },
      militia: { men: 800, horse: 0 },
      skirmishers: { men: 150, horse: 0 },
      rifles: { men: 150, horse: 0 },
      dragoons: { men: 250, horse: 250 },
      lancers: { men: 250, horse: 250 },
      cuirassiers: { men: 250, horse: 250 },
      hussars: { men: 250, horse: 250 },
      horse_archers: { men: 250, horse: 250 },
      "8lb_artillery": { men: 104, horse: 32 },
      "12lb_artillery": { men: 120, horse: 48 },
      "6lb_artillery": { men: 64, horse: 40 },
      "10lb_licorne": { men: 104, horse: 32 },
      "6lb_artillery_horse": { men: 84, horse: 64 },
      rockets: { men: 60, horse: 24 },
    };
    const templates = gameDataManager.getUnitTemplateManager().getTemplates();

    for (const [name, expected] of Object.entries(expectedByName)) {
      const unit = templates.find((template) => template.name === name)!;
      expect({ name, ...unit.reportStats }).toMatchObject({ name, ...expected });
    }
  });
});
