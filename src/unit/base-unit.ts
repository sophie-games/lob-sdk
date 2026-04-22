import { Entity, EntityType } from "@lob-sdk/entity";
import { Point2, Vector2 } from "@lob-sdk/vector";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import {
  EntityId,
  OrderType,
  UnitCategoryId,
  UnitEffectDto,
  UnitFormationTemplate,
  RangeUnitTemplate,
  UnitStatus,
  UnitTemplate,
  UnitType,
} from "@lob-sdk/types";
import {
  GameEra,
  MeleeDamageTypeTemplate,
  RangedDamageTypeTemplate,
  UnitCategoryTemplate,
} from "@lob-sdk/game-data-manager";
import { MIN_COLLISION_LEVEL } from "@lob-sdk/constants";
import {
  checkCollision,
  degreesToRadians,
  getDirectionToPoint,
  getFlankingPercent,
  getMaxOrgProportionDebuff,
} from "@lob-sdk/utils";
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
  abstract org: number;
  abstract stamina: number | null;
  abstract ammo: number | null;
  abstract supply: number | null;
  abstract position: Vector2;
  abstract rotation: number;
  abstract accumulatedRun: number;
  abstract category: UnitCategoryId;
  protected abstract template: UnitTemplate;
  protected abstract categoryTemplate: UnitCategoryTemplate;
  abstract type: UnitType;
  abstract player: number;
  abstract team: number;
  abstract status: UnitStatus;

  // --- Abstract fields for state tracking ---
  abstract hardAllyOverlap: number;
  abstract softAllyOverlap: number;
  abstract entrenchment: number;
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
  /**
   * If true, the unit cannot change formation in the current tick.
   */
  abstract cannotChangeFormation: boolean;
  /**
   * If true, the unit cannot charge in the current tick.
   */
  abstract cannotCharge: boolean;
  /**
   * The reorg debuff the unit will suffer in the current tick.
   */
  abstract reorgDebuff: number;

  // --- Template Statistics (Immutable) ---
  get unitName(): string { return this.template.name; }
  get maxHp(): number { return this.template.hp; }
  get maxOrg(): number { return this.template.org; }
  get maxStamina(): number { return this.template.stamina ?? 0; }
  get maxAmmo(): number { return (this.template as RangeUnitTemplate).ammo ?? 0; }
  get maxSupply(): number { return this.template.supply ?? 0; }
  get manpower(): number { return this.template.manpower; }
  get gold(): number { return this.template.gold; }

  get walkMovement(): number { return this.template.walkMovement; }
  get runStartUpMovement(): number { return this.template.runStartUpMovement ?? this.template.walkMovement; }
  get runMovement(): number { return this.template.runMovement; }
  get timeToRun(): number { return this.template.timeToRun; }
  get runCost(): number { return this.template.runCost; }

  get meleeAttack(): number { return this.template.meleeAttack; }
  get meleeDefense(): number { return this.template.meleeDefense; }
  get meleeDamageType(): string { return this.template.meleeDamageType; }
  get chargeBonus(): number { return this.template.chargeBonus; }
  get chargePenetration(): number { return this.template.chargePenetration ?? 0; }
  get chargeResistance(): number { return this.template.chargeResistance ?? 0; }
  get runChargeResistanceModifier(): number { return this.template.runChargeResistanceModifier ?? 0; }

  get rangedAttack(): number | null { return (this.template as RangeUnitTemplate).rangedAttack ?? null; }
  get rangedDamageTypes(): string[] | null {
    if ("rangedDamageTypes" in this.template) return this.template.rangedDamageTypes;
    return null;
  }
  
  get orgRadius(): number { return this.template.orgRadius; }
  get orgRadiusBonus(): number { return this.template.orgRadiusBonus; }
  get pushStrength(): number { return this.template.pushStrength ?? 0; }
  get pushDistance(): number { return this.template.pushDistance ?? 0; }

  get rotationSpeed(): number { return this.template.rotationSpeed; }
  get rotationMaxThreshold(): number { return this.template.rotationMaxThreshold; }
  get runRotationSpeed(): number { return this.template.runRotationSpeed; }
  get turningDelay(): number { return this.template.turningDelay ?? 0; }

  get shattersAtOrg(): number { return this.template.shattersAtOrg; }
  get routesAtOrg(): number { return this.template.routesAtOrg; }
  get recoversAtOrg(): number { return this.template.recoversAtOrg; }
  get ralliesAtOrg(): number { return this.template.ralliesAtOrg; }

  get supplyGoldCost(): number { return this.template.supplyGoldCost ?? 0; }
  get supplyManpowerCost(): number { return this.template.supplyManpowerCost ?? 0; }
  get defaultFormation(): string { return this.template.defaultFormation; }
  get canDeployForward(): boolean { return this.template.canDeployForward ?? false; }
  get maxEntrenchment(): number { return this.template.maxEntrenchment ?? 0; }
  get movementSound(): string { return this.template.movementSound; }
  get skirmisherRatio(): number { return this.template.skirmisherRatio ?? 0; }
  get supplyConsumptionIdle(): number | undefined { return this.template.supplyConsumptionIdle; }
  get supplyConsumptionMoving(): number | undefined { return this.template.supplyConsumptionMoving; }
  get supplyConsumptionCombating(): number | undefined { return this.template.supplyConsumptionCombating; }

  get fireWhileMoving(): boolean { return (this.template as RangeUnitTemplate).fireWhileMoving ?? false; }
  get minDistanceToFAA(): number { return (this.template as RangeUnitTemplate).minDistanceToFAA ?? 0; }
  get panicFireDistance(): number { return (this.template as RangeUnitTemplate).panicFireDistance ?? 0; }
  get noAmmoRegain(): boolean { return (this.template as RangeUnitTemplate).noAmmoRegain ?? false; }
  get unlimberTime(): number { return this.template.unlimberTime ?? 0; }
  get reducedVisibilityRange(): number | null { return this.template.reducedVisibilityRange ?? null; }
  get flankMeleeOrgModifier(): number { return this.template.flankMeleeOrgModifier ?? 0; }
  get flankChargePenBonus(): number { return this.template.flankChargePenBonus ?? 0; }

  // --- Category Statistics ---
  get captureSpeed(): number { return this.categoryTemplate.captureSpeed ?? 0; }
  get allyCollisionLevel(): number { return this.categoryTemplate.allyCollisionLevel ?? MIN_COLLISION_LEVEL; }
  get enemyCollisionLevel(): number { return this.categoryTemplate.enemyCollisionLevel ?? MIN_COLLISION_LEVEL; }
  get firingAltitude(): number { return this.categoryTemplate.firingAltitude ?? 0; }
  get autofirePriority(): Partial<Record<UnitCategoryId, number>> | null { return this.categoryTemplate.autofirePriority ?? null; }
  
  get enfiladeFireDamageModifier(): number { return this.categoryTemplate.enfiladeFire?.damageModifier ?? 0; }
  get enfiladeFireOrgModifier(): number { return this.categoryTemplate.enfiladeFire?.orgModifier ?? 0; }
  get rearFireOrgModifier(): number { return this.categoryTemplate.rearFire?.orgModifier ?? 0; }

  // --- Computed Properties ---
  get totalAllyOverlap(): number {
    return this.hardAllyOverlap + this.softAllyOverlap;
  }

  get _captureSpeed(): number {
    return this.captureSpeed; // For backward compatibility if needed, though captureSpeed is public
  }

  constructor(id: EntityId, era: GameEra, name?: string) {
    super(id, name);
    this.era = era;
  }

  // --- Core Methods ---
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

  /**
   * Temporary effects applied to the unit, along with the remaining number of ticks.
   */
  protected effects: Map<number, BaseUnitEffect> = new Map();

  hasEffect(effectId: number, inTicks?: number) {
    if (inTicks !== undefined) {
      const effect = this.effects.get(effectId);
      return effect !== undefined && effect.duration >= inTicks;
    }

    return this.effects.has(effectId);
  }

  isRanged() {
    return this.rangedDamageTypes !== null;
  }

  canFireAndAdvance() {
    return this.isRanged();
  }

  getHpProportion(): number {
    return this.hp / this.maxHp;
  }

  getOrgProportion() {
    return this.org / this.maxOrg;
  }

  /**
   * Returns the power of the unit (float).
   */
  getPower() {
    const basePower = BaseUnit.getBasePower(this.template) * this.getHpProportion();
    if (this.isRouting()) {
      return basePower * 0.5;
    }
    return basePower;
  }

  getMaxRange() {
    if (!this.rangedDamageTypes) {
      return 0;
    }

    const gameDataManager = GameDataManager.get(this.era);
    const { ranges } = gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
      this.rangedDamageTypes[this.rangedDamageTypes.length - 1],
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
    return GameDataManager.get(this.era).getDamageTypeByName<MeleeDamageTypeTemplate>(this.meleeDamageType);
  }

  private getCorners(): Point2[] {
    // Get unit dimensions from formation template
    const gameDataManager = GameDataManager.get(this.era);
    const dimensions = gameDataManager.getUnitDimensions(this.type, this.currentFormation);
    
    // Calculate the half-width and half-height
    const halfWidth = dimensions.width / 2;
    const halfHeight = dimensions.height / 2;
    // Calculate the sin and cos of the rotation angle
    const sinAngle = Math.sin(this.rotation);
    const cosAngle = Math.cos(this.rotation);

    // Define the original corner points relative to the center
    const corners: Point2[] = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight },
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
    return this.maxOrg - this.getMaxOrgDebuff();
  }

  getBaseMaxOrg() {
    return this.maxOrg;
  }

  getMaxOrgDebuff() {
    return Math.round(
      getMaxOrgProportionDebuff(
        GameDataManager.get(this.era),
        this.getHpProportion(),
        this.getStaminaProportion(),
      ) * this.maxOrg,
    );
  }

  getHasRanChargeResistanceModifier(): number {
    return this.hasEffect(HasRan.id) ? this.runChargeResistanceModifier : 0;
  }

  static getBasePower(template: UnitTemplate) {
    return template.manpower + template.gold;
  }

  moveTo(x: number, y: number) {
    this.position = new Vector2(x, y);
  }

  isReadyToCharge(accumulatedRun: number = this.accumulatedRun) {
    return accumulatedRun >= this.timeToRun;
  }

  isRunning(activeOrder: OrderType | null, accumulatedRun: number = this.accumulatedRun) {
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
    if (this.stamina === null || !this.maxStamina) {
      return 1;
    }
    return this.stamina / this.maxStamina;
  }

  isAlly(unit: BaseUnit) {
    return this.team === unit.team;
  }

  calculateCollisionShapes(position = this.position): Circle[] {
    const gameDataManager = GameDataManager.get(this.era);
    const formationTemplate = gameDataManager.getFormationManager().getTemplate(this.currentFormation);

    let collisionCircles: number;
    let collisionCircleSize: number;
    let collisionCircleDistance: number;
    let collisionCirclesVertical: boolean;

    if (formationTemplate) {
      // Use formation-specific collision data
      collisionCircles = formationTemplate.collisionCircles;
      collisionCircleSize = formationTemplate.collisionCircleSize;
      collisionCircleDistance = formationTemplate.collisionCircleDistance ?? formationTemplate.collisionCircleSize;
      collisionCirclesVertical = formationTemplate.collisionCirclesVertical ?? false;
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
    return gameDataManager.getUnitTemplateManager().getFormation(this.type, this.currentFormation);
  }

  getAvailableFormations(): UnitFormationTemplate[] {
    const gameDataManager = GameDataManager.get(this.era);
    return gameDataManager.getUnitTemplateManager().getAvailableFormations(this.type);
  }

  getDirectionToPoint(point: Vector2, frontBackArc?: number) {
    if (frontBackArc === undefined) {
      const gameDataManager = GameDataManager.get(this.era);
      const formation = gameDataManager.getFormationManager().getTemplate(this.currentFormation);
      frontBackArc = formation?.frontBackArc ? degreesToRadians(formation.frontBackArc) : degreesToRadians(90);
    }
    return getDirectionToPoint(this.position, point, this.rotation, frontBackArc);
  }

  getFlankMod(attackerPoint: Vector2) {
    const gameDataManager = GameDataManager.get(this.era);
    const formation = gameDataManager.getFormationManager().getTemplate(this.currentFormation);
    const minFlank = formation?.minFlankAngle ? degreesToRadians(formation.minFlankAngle) : degreesToRadians(45);
    const maxFlank = formation?.maxFlankAngle ? degreesToRadians(formation.maxFlankAngle) : degreesToRadians(135);
    return getFlankingPercent(attackerPoint, this.position, this.rotation, minFlank, maxFlank);
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
    const formationTemplate = gameDataManager.getFormationManager().getTemplate(this.currentFormation);
    return formationTemplate?.friendlyFireImmuneDamageTypes?.includes(damageType) ?? false;
  }

  hasBeenAttacked() {
    return this.hasEffect(BeenInMelee.id) || this.hasEffect(TakenFire.id);
  }

  mustDeployForward() {
    return this.canDeployForward;
  }

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
    const categoryTemplate = gameDataManager.getUnitCategoryTemplate(this.category);
    return categoryTemplate.routingBehavior?.baseSpeed === "run";
  }

  abstract isMoving(): boolean;
  abstract inMelee(): boolean;
}

