import {
  GameDataManager,
  STAT_PRECISION_SCALE,
} from "@lob-sdk/game-data-manager";
import type { RangedDamageTypeTemplate } from "@lob-sdk/game-data-manager/types";
import { OrderType, TerrainType } from "@lob-sdk/types";

describe("Napoleonic balance", () => {
  const gameDataManager = GameDataManager.get("napoleonic");

  it("uses the requested routing-unit organization-radius multiplier", () => {
    expect(
      gameDataManager.getGameRules().organization
        ?.routingUnitNearbyUnitsOrgBonus,
    ).toBe(5);
  });

  it("uses the requested 1.8 stamina recovery and order modifiers", () => {
    expect(gameDataManager.getGameRules().stamina?.regainRates).toEqual({
      range1: 5000,
      range2: 7500,
      range3: 8750,
      range4: 7500,
      range5: 3750,
    });

    const fireAndAdvance = gameDataManager.getOrderTemplate(
      OrderType.FireAndAdvance,
    );
    expect(fireAndAdvance).toMatchObject({
      speedModifierWhenShooting: -0.25,
      speedModifierWhenShootingByCategory: {
        infantry: -0.25,
        guardsInfantry: -0.25,
        skirmishInfantry: -0.25,
        militiaInfantry: -0.35,
        artillery: -0.35,
      },
      rangedDamageModifier: -0.25,
      rangedDamageModifierByCategory: {
        infantry: -0.25,
        guardsInfantry: -0.25,
        skirmishInfantry: -0.25,
        militiaInfantry: -0.35,
        artillery: -0.5,
      },
    });

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

  it("uses the requested cavalry turning and pushing values", () => {
    const expectedByName = {
      hussars: {
        rotationSpeed: 0.37,
        runRotationSpeed: 0.34,
        pushStrength: 14,
        pushDistance: 0.8,
      },
      lancers: {
        rotationSpeed: 0.37,
        runRotationSpeed: 0.3,
        pushStrength: 14,
        pushDistance: 0.8,
      },
      horse_archers: {
        rotationSpeed: 0.37,
        runRotationSpeed: 0.34,
        pushStrength: 14,
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
        pushStrength: 18,
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

  it("uses a 450 organization damage ratio for skirmisher and rifle fire", () => {
    for (const damageType of ["marksman-musket", "rifle"]) {
      const { orgDamageRatio } =
        gameDataManager.getDamageTypeByName(damageType);

      expect(orgDamageRatio / STAT_PRECISION_SCALE).toBe(450);
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

  it("uses the requested universal ammo reserves", () => {
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

  it("uses the requested 1.8 artillery ammo costs", () => {
    const cannonBallNames = [
      "18lb-cannon-ball",
      "12lb-cannon-ball",
      "10lb-cannon-ball",
      "8lb-cannon-ball",
      "6lb-cannon-ball",
      "4lb-cannon-ball",
    ];
    const canisterNames = [
      "18lb-canister-fire",
      "12lb-canister-fire",
      "10lb-canister-fire",
      "8lb-canister-fire",
      "6lb-canister-fire",
      "4lb-canister-fire",
      "howitzer-canister",
    ];
    const explosiveShellNames = [
      "18lb-explosive-shell",
      "10lb-explosive-shell",
      "explosive-shell",
    ];

    for (const name of cannonBallNames) {
      expect(
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name)
          .ammoCost! / STAT_PRECISION_SCALE,
      ).toBe(100);
    }

    for (const name of canisterNames) {
      const canister =
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name);

      expect(canister.ammoCost! / STAT_PRECISION_SCALE).toBe(200);
    }

    for (const name of explosiveShellNames) {
      expect(
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name)
          .ammoCost! / STAT_PRECISION_SCALE,
      ).toBe(110);
    }
  });

  it("preserves the requested artillery damage ratios and field-gun ranges", () => {
    for (const name of [
      "18lb-canister-fire",
      "12lb-canister-fire",
      "10lb-canister-fire",
      "8lb-canister-fire",
      "6lb-canister-fire",
      "4lb-canister-fire",
    ]) {
      const canister =
        gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name);

      expect(canister.orgDamageRatio / STAT_PRECISION_SCALE).toBe(285);
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

  it("uses the requested 1.8 artillery unit balance", () => {
    const expectedByName = {
      "8lb_artillery": { runMovement: 80, guns: 8 },
      "6lb_artillery_horse": {
        manpower: 75,
        rangedAttack: 2800,
        runMovement: 160,
        timeToRun: 6,
        guns: 6,
      },
      "6in_howitzer": {
        rangedAttack: 3000,
        rotationSpeed: 0.4,
        panicFireDistance: 90,
        guns: 6,
      },
      "12lb_artillery": { runMovement: 70, guns: 8 },
      "4lb_artillery": { manpower: 50, rangedAttack: 2500, guns: 6 },
      "6lb_artillery": { runMovement: 80, hp: 80000, guns: 8 },
      rockets: { runMovement: 160, guns: 6 },
      "10lb_licorne": {
        rangedAttack: 3200,
        runMovement: 80,
        hp: 60000,
        guns: 6,
      },
      "18lb_licorne": {
        rangedAttack: 3700,
        runMovement: 70,
        hp: 60000,
        guns: 6,
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

  it("uses the requested 1.8 rocket balance", () => {
    const rocket =
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>("rocket");

    expect(rocket.projectilePenetration).toBe(0.8);
    expect(rocket.areaOfEffect).toMatchObject({
      edgeDamageModifier: -0.4,
      absorptionModifier: 0,
    });
  });

  it("uses the requested 1.8 Licorne damage curves", () => {
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
        { damageModifier: { near: 0, far: -0.38 } },
      ]);
      expect(cannonBall.ranges).toMatchObject([
        { damageModifier: { near: 1, far: 0.45 } },
      ]);
      expect(canister.ranges).toMatchObject([
        { name: "close", damageModifier: { near: 4.2, far: 2.9 } },
        { name: "long", damageModifier: { near: 2.35, far: 1.95 } },
      ]);
    }
  });

  it("uses the requested 1.8 howitzer damage balance", () => {
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

    expect(shell.orgDamageRatio / STAT_PRECISION_SCALE).toBe(225);
    expect(shell.damageModifierByTargetHp).toEqual(
      licorneShell.damageModifierByTargetHp,
    );
    expect(shell.orgDamageModifierByTargetOrg).toEqual(
      licorneShell.orgDamageModifierByTargetOrg,
    );
    expect(shell.ranges).toHaveLength(1);
    expect(shell.ranges[0]).toMatchObject({
      to: 1,
      damageModifier: { near: 0, far: -0.25 },
    });
    expect(shell.ranges[0].from * shell.maxRange).toBeCloseTo(90, 1);
    expect(shell.ranges[0].name).toBeUndefined();
    expect(shell.areaOfEffect?.ranges[0]).toMatchObject({ start: 90 });
    expect(canister).toMatchObject({
      maxRange: 90,
      ranges: [{ damageModifier: { far: 1 } }],
    });
  });

  it("uses the 1.8 formation balance", () => {
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
      rangedAttackModifier: -0.85,
      flankChargeResistance: -0.6,
    });
    const line = gameDataManager.getFormationManager().getTemplate("line");
    const square = gameDataManager.getFormationManager().getTemplate("square");

    expect(line).toMatchObject({
      flankChargeResistance: -0.6,
    });
    expect(line?.rangedAttackModifier).toBeUndefined();
    expect(square).toMatchObject({
      pushStrengthModifier: 0.5,
      receivedMeleeDamageModifier: 0,
      chargeResistanceModifier: 0.25,
    });
    expect(square?.rangedAttackModifier).toBeUndefined();
    expect(
      gameDataManager.getFormationManager().getTemplate("cavalry"),
    ).toMatchObject({ minMovementModifier: -0.85 });
    expect(
      gameDataManager.getFormationManager().getTemplate("artillery"),
    ).toMatchObject({ minMovementModifier: -0.5 });
  });

  it("uses the requested elite infantry balance", () => {
    const expectedByName = {
      guards: {
        org: 975,
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
      rangedAttack: 40 * STAT_PRECISION_SCALE,
      org: 725 * STAT_PRECISION_SCALE,
    });
  });

  it("uses the requested 1.8 infantry attack and charge values", () => {
    const expectedByName = {
      line_infantry: { rangedAttack: 3466, chargeBonus: 6500 },
      guards: { rangedAttack: 3800, chargeBonus: 7000 },
      light_infantry: { rangedAttack: 4000, chargeBonus: 6500 },
      militia: { rangedAttack: 2800, chargeBonus: 6500 },
      grenadiers: { rangedAttack: 3600, chargeBonus: 7500 },
      skirmishers: {
        rangedAttack: 2266,
        chargeBonus: 1000,
        chargeResistance: -0.2,
      },
      rifles: {
        rangedAttack: 2400,
        chargeBonus: 1000,
        chargeResistance: -0.2,
      },
    } as const;
    const unitTemplates = gameDataManager
      .getUnitTemplateManager()
      .getTemplates();

    for (const [name, expected] of Object.entries(expectedByName)) {
      const unit = unitTemplates.find((template) => template.name === name);

      expect(unit).toMatchObject(expected);
    }

    expect(
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>("musket")
        .ranges[0].damageModifier.near,
    ).toBe(9);
  });

  it("uses the requested cavalry charge and organization balance", () => {
    const expectedByName = {
      cuirassiers: {
        chargeBonus: 140,
        chargeResistance: 0.3,
        orgRadiusBonus: 9,
        timeToRun: 5,
      },
      lancers: {
        chargeBonus: 140,
        chargeResistance: 0.15,
        orgRadiusBonus: 6,
        timeToRun: 5,
      },
      dragoons: {
        chargeBonus: 125,
        chargeResistance: 0.25,
        orgRadiusBonus: 6,
        org: 850,
        timeToRun: 4,
      },
      hussars: {
        chargeBonus: 100,
        chargeResistance: 0.15,
        orgRadiusBonus: 4,
        timeToRun: 3,
      },
      horse_archers: {
        chargeBonus: 60,
        chargeResistance: 0.15,
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
      expect(unit.orgRadius).toBe(64);
      expect(unit.timeToRun).toBe(expected.timeToRun);
      expect(unit.chargeResistance).toBe(expected.chargeResistance);

      if (name === "horse_archers") {
        expect(unit.chargePenetration).toBe(0.3);
      }

      if ("org" in expected) {
        expect(unit.org / STAT_PRECISION_SCALE).toBe(expected.org);
      }
    }
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

  it("uses the requested 1.8 road movement balance", () => {
    const nonArtilleryCategories = [
      "infantry",
      "guardsInfantry",
      "skirmishInfantry",
      "militiaInfantry",
      "midCavalry",
      "lightCavalry",
      "scoutCavalry",
      "heavyCavalry",
    ] as const;

    for (const category of nonArtilleryCategories) {
      expect(
        gameDataManager.getMovementModifier(TerrainType.Road, category),
      ).toBe(0.75);
      expect(
        gameDataManager.getRunSpeedModifier(TerrainType.Road, category),
      ).toBe(-0.25);
    }

    expect(
      gameDataManager.getMovementModifier(TerrainType.Road, "artillery"),
    ).toBe(0.3);
    expect(
      gameDataManager.getRunSpeedModifier(TerrainType.Road, "artillery"),
    ).toBe(0.2);
    expect(gameDataManager.getStaminaCost(TerrainType.Road)).toBe(-0.5);
  });

  it("uses the requested 1.8 forest balance", () => {
    expect(gameDataManager.getPushStrengthModifier(TerrainType.Forest)).toBe(
      0.2,
    );
    expect(gameDataManager.getPushDistanceModifier(TerrainType.Forest)).toBe(2);
    expect(gameDataManager.getStaminaCost(TerrainType.Forest)).toBe(-0.5);
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
      ).toBe(-0.25);
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

    expect(
      gameDataManager.getRangedAttackModifier(TerrainType.Forest, "artillery"),
    ).toBe(-0.5);

    const expectedAbsorption = {
      musket: 0.25,
      "marksman-musket": 0.15,
      rifle: 0.15,
      "horse-archer-bow": 0.4,
      "4lb-cannon-ball": 0.3,
      "6lb-cannon-ball": 0.25,
      "8lb-cannon-ball": 0.25,
      "10lb-cannon-ball": 0.25,
      "12lb-cannon-ball": 0.2,
      "18lb-cannon-ball": 0.2,
      "4lb-canister-fire": 0.3,
      "6lb-canister-fire": 0.3,
      "8lb-canister-fire": 0.3,
      "10lb-canister-fire": 0.3,
      "12lb-canister-fire": 0.3,
      "18lb-canister-fire": 0.3,
      "howitzer-canister": 0.3,
      "explosive-shell": 0.1,
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

  it("uses the requested 1.8 building balance", () => {
    expect(gameDataManager.getPushStrengthModifier(TerrainType.Building)).toBe(
      0.2,
    );
    expect(gameDataManager.getPushDistanceModifier(TerrainType.Building)).toBe(
      2,
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
    ).toBe(-0.15);

    for (const category of [
      "infantry",
      "guardsInfantry",
      "militiaInfantry",
    ] as const) {
      expect(
        gameDataManager.getRangedAttackModifier(TerrainType.Building, category),
      ).toBe(-0.4);
    }

    const expectedAbsorption = {
      "horse-archer-bow": 0.7,
      "4lb-cannon-ball": 0.3,
      "6lb-cannon-ball": 0.2,
      "8lb-cannon-ball": 0.2,
      "10lb-cannon-ball": 0.2,
      "12lb-cannon-ball": 0.15,
      "18lb-cannon-ball": 0.15,
      "howitzer-canister": 0.4,
      "explosive-shell": 0.12,
      "10lb-explosive-shell": 0.12,
      "18lb-explosive-shell": 0.12,
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
    ).toMatchObject({ runMovementModifier: 2 });
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
    ).toBe(0.85);

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
