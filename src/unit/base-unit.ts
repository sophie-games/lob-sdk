import { Entity, EntityType } from "@lob-sdk/entity";
import { Point2, Vector2 } from "@lob-sdk/vector";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import {
  EntityId,
  OrderType,
  UnitCategoryId,
  UnitEffectDto,
  UnitFormationTemplate,
  UnitStatus,
  UnitTemplate,
  UnitType,
} from "@lob-sdk/types";
import {
  GameEra,
  MeleeDamageTypeTemplate,
  RangedDamageTypeTemplate,
} from "@lob-sdk/game-data-manager";
import {
  checkCollision,
  degreesToRadians,
  getDirectionToPoint,
  getMaxOrgProportionDebuff,
} from "@lob-sdk/utils";
import { TerrainType } from "@lob-sdk/types";
import { Circle } from "@lob-sdk/shapes/circle";
import {
  BaseUnitEffect,
  BeenInMelee,
  TakenFire,
  HasRan,
} from "@lob-sdk/unit-effects";
import { getSquaredDistance } from "@lob-sdk/utils";

export abstract class BaseUnit extends Entity {
  readonly entityType = EntityType.Unit;

  readonly era: GameEra;
  abstract hp: number;
  abstract maxHp: number;
  abstract org: number;
  abstract stamina: number | null;
  abstract ammo: number | null;
  abstract supply: number | null;
  abstract position: Vector2;
  abstract rotation: number;
  abstract walkMovement: number;
  abstract runStartUpMovement: number;
  abstract runMovement: number;
  abstract timeToRun: number;
  abstract runCost: number;
  abstract accumulatedRun: number;
  abstract category: UnitCategoryId;
  abstract template: UnitTemplate;
  abstract type: UnitType;
  abstract player: number;
  abstract team: number;
  abstract status: UnitStatus;
  abstract orgRadius: number;
  abstract orgRadiusBonus: number;
  abstract chargeResistance: number;
  abstract runChargeResistanceModifier: number;
  abstract totalAllyOverlap: number;
  abstract allyCollisionLevel: number;
  abstract enemyCollisionLevel: number;
  abstract autofirePriority: Partial<Record<UnitCategoryId, number>> | null;
  cachedTerrain: TerrainType | null = null;
  abstract firingAltitude: number;

  abstract entrenchment: number;
  abstract maxEntrenchment: number;

  /**
   * Current formation ID for this unit.
   */
  abstract currentFormation: string;
  abstract pendingFormationId: string | null;
  abstract formationChangeTicksRemaining: number;

  /**
   * These are the damage types that are disabled for autofire.
   * By default, all damage types are enabled for autofire. We made it this way to avoid
   * sending a lot of data over the network.
   */
  abstract holdFireDamageTypes: number[];

  abstract rotationSpeed: number;
  abstract rotationMaxThreshold: number;
  abstract runRotationSpeed: number;
  abstract turningDelay: number;

  /**
   * Temporary effects applied to the unit, along with the remaining number of ticks.
   */
  protected effects: Map<number, BaseUnitEffect> = new Map();

  abstract enfiladeFireDamageModifier: number;
  abstract enfiladeFireOrgModifier: number;
  abstract rearFireOrgModifier: number;
  abstract pushStrength: number;
  abstract pushDistance: number;

  /**
   * If true, the unit cannot change formation in the current tick.
   */
  abstract cannotChangeFormation: boolean;

  /**
   * If true, the unit cannot charge in the current tick.
   */
  abstract cannotCharge: boolean;

  /**
   * If true, the unit has attacked in the current tick.
   */
  abstract hasAttacked: boolean;

  /**
   * The reorg debuff the unit will suffer in the current tick.
   */
  abstract reorgDebuff: number;

  constructor(id: EntityId, era: GameEra, name?: string) {
    super(id, name);

    this.era = era;
  }

  getEffects() {
    return this.effects.values();
  }

  getEffectDtos() {
    const effectDtos: UnitEffectDto[] = [];
    for (const effect of this.effects.values()) {
      effectDtos.push(effect.toDto());
    }
    return effectDtos;
  }

  hasEffect(effectId: number, inTicks?: number) {
    if (inTicks !== undefined) {
      const effect = this.effects.get(effectId);
      return effect !== undefined && effect.duration >= inTicks;
    }

    return this.effects.has(effectId);
  }

  /**
   * Returns if the unit is ranged.
   */
  isRanged() {
    return this.rangedDamageTypes !== null;
  }

  canFireAndAdvance() {
    return this.isRanged();
  }

  getHpProportion(): number {
    return this.hp / this.template.hp;
  }

  getOrgProportion() {
    return this.org / this.template.org;
  }

  getPower() {
    const basePower =
      BaseUnit.getBasePower(this.template) * this.getHpProportion();

    if (this.isRouting()) {
      return Math.round(basePower * 0.5);
    }

    return Math.round(basePower);
  }

  get meleeDamageType() {
    return this.template.meleeDamageType;
  }

  get rangedDamageTypes() {
    if ("rangedDamageTypes" in this.template) {
      return this.template.rangedDamageTypes;
    }

    return null;
  }

  getMaxRange() {
    if (!this.rangedDamageTypes) {
      return 0;
    }

    const gameDataManager = GameDataManager.get(this.era);

    const { ranges } =
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
        this.rangedDamageTypes[this.rangedDamageTypes.length - 1]
      );

    const { UNIT_RANGE_MARGIN } = gameDataManager.getGameConstants();

    return ranges[ranges.length - 1].end + UNIT_RANGE_MARGIN;
  }

  /**
   * Returns if the unit is routing.
   */
  isRouting() {
    return this.status === UnitStatus.Routing;
  }

  /**
   * Returns if the unit is routing or recovering.
   *
   */
  isRoutingOrRecovering() {
    return (
      this.status === UnitStatus.Routing ||
      this.status === UnitStatus.Recovering
    );
  }

  canUseOrder(orderType: OrderType) {
    const gameDataManager = GameDataManager.get(this.era);

    if (orderType === OrderType.FireAndAdvance && !this.canFireAndAdvance()) {
      // Even if the unit category can fire and advance, if it's not ranged then it won't be able to use it.
      // This is to allow horse archers to use FAA and, at the same time, prevent melee cavalry from using it.
      return false;
    }

    return gameDataManager.canUseOrder(this.category, orderType);
  }

  getMeleeDamageTypeConfig() {
    return GameDataManager.get(
      this.era
    ).getDamageTypeByName<MeleeDamageTypeTemplate>(this.meleeDamageType);
  }

  private getCorners(): Point2[] {
    // Get unit dimensions from formation template
    const gameDataManager = GameDataManager.get(this.era);
    const dimensions = gameDataManager.getUnitDimensions(
      this.type,
      this.currentFormation
    );

    // Calculate the half-width and half-height
    const halfWidth = dimensions.width / 2;
    const halfHeight = dimensions.height / 2;

    // Calculate the sin and cos of the rotation angle
    const sinAngle = Math.sin(this.rotation);
    const cosAngle = Math.cos(this.rotation);

    // Define the original corner points relative to the center
    const corners: Point2[] = [
      { x: -halfWidth, y: -halfHeight }, // Top-left
      { x: halfWidth, y: -halfHeight }, // Top-right
      { x: halfWidth, y: halfHeight }, // Bottom-right
      { x: -halfWidth, y: halfHeight }, // Bottom-left
    ];

    // Rotate and translate each corner point
    return corners.map((corner) => {
      const rotatedX = corner.x * cosAngle - corner.y * sinAngle;
      const rotatedY = corner.x * sinAngle + corner.y * cosAngle;

      return { x: rotatedX + this.position.x, y: rotatedY + this.position.y };
    });
  }

  getClosestCorner(unit: BaseUnit) {
    const corners = unit.getCorners();

    let distance = Infinity;
    let closest: Point2;

    for (const corner of corners) {
      const newDistance = getSquaredDistance(this.position, corner);

      if (newDistance < distance) {
        distance = newDistance;
        closest = corner;
      }
    }

    return closest!;
  }

  getLastRangedDamageType() {
    return this.rangedDamageTypes![this.rangedDamageTypes!.length - 1];
  }

  /**
   * @returns The max org a unit can have taking into account the debuffs.
   */
  calculateMaxOrg() {
    return this.template.org - this.getMaxOrgDebuff();
  }

  getBaseMaxOrg() {
    return this.template.org;
  }

  getMaxOrgDebuff() {
    return Math.round(
      getMaxOrgProportionDebuff(
        GameDataManager.get(this.era),
        this.getHpProportion(),
        this.getStaminaProportion()
      ) * this.template.org
    );
  }

  getHasRanChargeResistanceModifier(): number {
    return this.hasEffect(HasRan.id) ? this.runChargeResistanceModifier : 0;
  }

  static getBasePower(template: UnitTemplate) {
    return template.manpower + template.gold;
  }

  moveTo(x: number, y: number) {
    this.cachedTerrain = null;
    this.position = new Vector2(x, y);
  }

  isReadyToCharge(accumulatedRun: number = this.accumulatedRun) {
    return accumulatedRun >= this.timeToRun;
  }

  isRunning(
    activeOrder: OrderType | null,
    accumulatedRun: number = this.accumulatedRun
  ) {
    const gameDataManager = GameDataManager.get(this.era);

    if (this.isRunRouting()) {
      return true;
    }

    const { stamina } = gameDataManager.getGameRules();

    return (
      (!stamina || this.getStaminaProportion() > stamina.lowerModifierLimit) &&
      activeOrder === OrderType.Run &&
      this.isReadyToCharge(accumulatedRun)
    );
  }

  getStaminaProportion() {
    if (this.stamina === null || !this.template.stamina) {
      return 1; // Units without stamina are considered at full "stamina"
    }
    return this.stamina / this.template.stamina;
  }

  getMaxStamina(): number {
    return this.template.stamina ?? 0;
  }

  isAlly(unit: BaseUnit) {
    return this.team === unit.team;
  }

  calculateCollisionShapes(position = this.position): Circle[] {
    const gameDataManager = GameDataManager.get(this.era);
    const formationTemplate = gameDataManager
      .getFormationManager()
      .getTemplate(this.currentFormation);

    let collisionCircles: number;
    let collisionCircleSize: number;
    let collisionCircleDistance: number;
    let collisionCirclesVertical: boolean;

    if (formationTemplate) {
      // Use formation-specific collision data
      collisionCircles = formationTemplate.collisionCircles;
      collisionCircleSize = formationTemplate.collisionCircleSize;
      collisionCircleDistance =
        formationTemplate.collisionCircleDistance ??
        formationTemplate.collisionCircleSize;
      collisionCirclesVertical =
        formationTemplate.collisionCirclesVertical ?? false;
    } else {
      // Fallback
      collisionCircles = 1;
      collisionCircleSize = 16;
      collisionCircleDistance = 16;
      collisionCirclesVertical = false;
    }

    const { x: dx, y: dy } = position;
    const radius = collisionCircleSize / 2;

    const circles: Circle[] = [];

    // Generate circles based on configuration
    for (let i = 0; i < collisionCircles; i++) {
      // Calculate center position for this circle
      // Space circles based on their size to create proper overlap
      let centerX = 0;
      let centerY = 0;
      if (collisionCircles > 1) {
        // Use the circle distance to determine spacing
        // For overlapping circles, space them at the specified distance
        const totalSpan = (collisionCircles - 1) * collisionCircleDistance;
        const offset = -totalSpan / 2 + i * collisionCircleDistance;

        if (collisionCirclesVertical) {
          // Arrange circles vertically (along X axis)
          centerX = offset;
        } else {
          // Arrange circles horizontally (along Y axis) - default behavior
          centerY = offset;
        }
      }

      const center = { x: centerX, y: centerY };

      // Use -this.rotation to reverse the rotation direction
      const cosTheta = Math.cos(-this.rotation);
      const sinTheta = Math.sin(-this.rotation);

      // Rotate center around (0, 0)
      const rotatedX = dx + center.x * cosTheta + center.y * sinTheta;
      const rotatedY = dy + -center.x * sinTheta + center.y * cosTheta;

      circles.push(new Circle(rotatedX, rotatedY, radius));
    }

    return circles;
  }

  protected getCurrentFormationData(): UnitFormationTemplate | null {
    if (!this.currentFormation) return null;
    const gameDataManager = GameDataManager.get(this.era);
    return gameDataManager
      .getUnitTemplateManager()
      .getFormation(this.type, this.currentFormation);
  }

  getAvailableFormations(): UnitFormationTemplate[] {
    const gameDataManager = GameDataManager.get(this.era);
    return gameDataManager
      .getUnitTemplateManager()
      .getAvailableFormations(this.type);
  }

  getDirectionToPoint(point: Vector2, frontBackArc?: number) {
    if (frontBackArc === undefined) {
      const gameDataManager = GameDataManager.get(this.era);
      const formation = gameDataManager
        .getFormationManager()
        .getTemplate(this.currentFormation);
      frontBackArc = formation?.frontBackArc
        ? degreesToRadians(formation.frontBackArc)
        : degreesToRadians(90);
    }

    return getDirectionToPoint(
      this.position,
      point,
      this.rotation,
      frontBackArc
    );
  }

  canAllyCollide(ally: BaseUnit) {
    return (
      !this.isRouting() &&
      !ally.isRouting() &&
      checkCollision(ally.allyCollisionLevel, this.allyCollisionLevel)
    );
  }

  isFriendlyFireImmune(damageType: string): boolean {
    const gameDataManager = GameDataManager.get(this.era);
    const formationTemplate = gameDataManager
      .getFormationManager()
      .getTemplate(this.currentFormation);
    return (
      formationTemplate?.friendlyFireImmuneDamageTypes?.includes(damageType) ??
      false
    );
  }

  hasBeenAttacked() {
    return this.hasEffect(BeenInMelee.id) || this.hasEffect(TakenFire.id);
  }

  getDeploymentBuffer() {
    const { FORWARD_DEPLOYMENT_ZONE_OFFSET } = GameDataManager.get(
      this.era
    ).getGameConstants();

    return this.template.canDeployForward ? FORWARD_DEPLOYMENT_ZONE_OFFSET : 0;
  }

  /** Routing units cannot see */
  static isVisionSource(status?: UnitStatus) {
    return !status || status === UnitStatus.Standing;
  }

  addEffect(effect: BaseUnitEffect) {
    const existingEffect = this.effects.get(effect.id);
    if (existingEffect) {
      existingEffect.merge(effect);
    } else {
      this.effects.set(effect.id, effect);
      effect.onAdded(this);
    }
  }

  deleteEffect(effectId: number) {
    this.effects.delete(effectId);
  }

  getEffect<T extends BaseUnitEffect>(effectId: number): T | undefined {
    return this.effects.get(effectId) as T | undefined;
  }

  isRunRouting() {
    if (!this.isRouting()) {
      return false;
    }

    const gameDataManager = GameDataManager.get(this.era);
    const categoryTemplate = gameDataManager.getUnitCategoryTemplate(
      this.category
    );
    return categoryTemplate.routingBehavior?.baseSpeed === "run";
  }

  abstract isMoving(): boolean;
  abstract inMelee(): boolean;
}
