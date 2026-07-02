import { Entity, EntityType } from "@lob-sdk/entity";
import { Point2, Vector2 } from "@lob-sdk/vector";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import {
  getCollisionConfig,
  isCircleCollision,
  getFrontBackArc,
  getFlankAngles,
  CollisionShapeConfig,
  CollisionShapeType,
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
  EngagementRange,
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
  CollisionShape,
  ObbShape,
  CircleShape,
  localObbCorners,
} from "@lob-sdk/shapes/collision-shape";
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
  readonly gameDataManager: GameDataManager;
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
  /** Pending formation if queued, else current — reflects player intent. */
  get effectiveFormation(): string { return this.pendingFormationId ?? this.currentFormation; }
  abstract formationChangeTicksRemaining: number;
  /**
   * Autofire engagement-range throttle. The unit only autofires a damage type's range band when
   * this tier is at least the band's `engagementTier` (untagged bands count as `Max`). Defaults
   * to `Max` (open fire at full range). Applies to autofire only, not ordered or panic fire.
   */
  abstract autofireRange: EngagementRange;
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
    const types = (this.template as RangeUnitTemplate).rangedDamageTypes;
    return types?.length ? types : null;
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
  // Collision levels are formation-derived (see FormationTemplate); default solid.
  get allyCollisionLevel(): number { return this.effectiveFormationTemplate?.allyCollisionLevel ?? MIN_COLLISION_LEVEL; }
  get enemyCollisionLevel(): number { return this.effectiveFormationTemplate?.enemyCollisionLevel ?? MIN_COLLISION_LEVEL; }
  private get effectiveFormationTemplate() {
    return this.gameDataManager.getFormationManager().getTemplate(this.effectiveFormation);
  }
  get firingAltitude(): number { return this.categoryTemplate.firingAltitude ?? 0; }
  /**
   * Naval-style steering: the unit moves only along its heading (forward, or
   * astern on fallback) and only turns while making way, so it can't strafe or
   * pivot in place. See `UnitCategoryTemplate.forwardOnlyMovement`.
   */
  get forwardOnlyMovement(): boolean { return this.categoryTemplate.forwardOnlyMovement === true; }
  get autofirePriority(): Partial<Record<UnitCategoryId, number>> | null { return this.categoryTemplate.autofirePriority ?? null; }
  /** Default autofire engagement tier for this category (see `autofireRange`); `Max` when unset. */
  get defaultAutofireRange(): EngagementRange { return this.categoryTemplate.defaultAutofireRange ?? EngagementRange.Max; }
  /** Whether the autofire selector should warn that the `Max` tier wastes ammo for this category. */
  get warnsOnMaxAutofire(): boolean { return this.categoryTemplate.warnOnMaxAutofire === true; }
  
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

  constructor(id: EntityId, gameDataManager: GameDataManager, name?: string) {
    super(id, name);
    this.gameDataManager = gameDataManager;
    this.era = gameDataManager.era;
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

    return this.gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(
      this.rangedDamageTypes[this.rangedDamageTypes.length - 1],
    ).maxRange;
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
    if (orderType === OrderType.FireAndAdvance && !this.canFireAndAdvance()) {
      // Even if the unit category can fire and advance, if it's not ranged then it won't be able to use it.
      // This is to allow horse archers to use FAA and, at the same time, prevent melee cavalry from using it.
      return false;
    }
    return this.gameDataManager.canUseOrder(this.category, orderType);
  }

  getMeleeDamageTypeConfig() {
    return this.gameDataManager.getDamageTypeByName<MeleeDamageTypeTemplate>(this.meleeDamageType);
  }

  /**
   * World-space corners of the unit's oriented bounding box (rotated rectangle)
   * at the given position and rotation. Front is the +X edge; height spans the frontage.
   */
  calculateObbCorners(
    position: Point2 = this.position,
    rotation: number = this.rotation,
  ): Point2[] {
    const dimensions = this.gameDataManager.getUnitDimensions(
      this.type,
      this.effectiveFormation,
    );
    const sinAngle = Math.sin(rotation);
    const cosAngle = Math.cos(rotation);

    return localObbCorners(dimensions.width, dimensions.height).map((corner) => ({
      x: corner.x * cosAngle - corner.y * sinAngle + position.x,
      y: corner.x * sinAngle + corner.y * cosAngle + position.y,
    }));
  }

  private getCorners(): Point2[] {
    return this.calculateObbCorners();
  }

  /**
   * The unit formation's collision config, or a small default circle when the unit
   * has no formation template. The single source of the null-formation fallback.
   */
  private resolveCollisionConfig(): CollisionShapeConfig {
    const formation = this.gameDataManager
      .getFormationManager()
      .getTemplate(this.effectiveFormation);
    return formation
      ? getCollisionConfig(formation)
      : { type: CollisionShapeType.Circle, radius: 8 };
  }

  /** True when this formation collides as a rotated rectangle (Obb) rather than a circle. */
  usesObbCollision(): boolean {
    return !isCircleCollision(this.resolveCollisionConfig());
  }

  /**
   * The unit's collision footprint as a single shape: a rotated rectangle (Obb) sized
   * by the formation's frontage/depth, or a circle of the formation's radius. The
   * narrow phase resolves overlap per shape pair.
   */
  getCollisionShape(position: Point2 = this.position): CollisionShape {
    const config = this.resolveCollisionConfig();
    if (isCircleCollision(config)) {
      return new CircleShape({ x: position.x, y: position.y }, config.radius);
    }
    return new ObbShape(this.calculateObbCorners(position));
  }

  /**
   * Bounding-circle radius of the collision footprint (no allocation): the circle
   * radius, or the OBB half-diagonal. For a cheap broad-phase reject before the
   * exact overlap test.
   */
  getCollisionBoundingRadius(): number {
    const config = this.resolveCollisionConfig();
    return isCircleCollision(config)
      ? config.radius
      : Math.hypot(config.frontage, config.depth) / 2;
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
        this.gameDataManager,
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
    if (this.isRunRouting()) {
      return true;
    }
    const { stamina } = this.gameDataManager.getGameRules();
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

  /**
   * Circles approximating the unit's footprint, turned with the unit. Used by the
   * soft tests (shot line-of-sight, AoE, edge contact). For a circle formation it is
   * the single circle; for an Obb it is circles spaced along the longer side (radius =
   * half the shorter side), which reproduces the legacy tuned multi-circle layout
   * from frontage/depth instead of explicit knobs.
   */
  calculateCollisionShapes(position = this.position): Circle[] {
    const config = this.resolveCollisionConfig();

    if (isCircleCollision(config)) {
      return config.radius > 0
        ? [new Circle(position.x, position.y, config.radius)]
        : [];
    }

    const { frontage, depth } = config;
    if (frontage <= 0 || depth <= 0) return [];
    const longer = Math.max(frontage, depth);
    const shorter = Math.min(frontage, depth);
    const radius = shorter / 2;
    const count = Math.max(1, Math.round(longer / shorter));
    const alongDepth = depth > frontage; // local X for a deep formation, else local Y
    const span = (count - 1) * shorter;

    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const circles: Circle[] = [];
    for (let i = 0; i < count; i++) {
      const offset = count > 1 ? -span / 2 + i * shorter : 0;
      const localX = alongDepth ? offset : 0;
      const localY = alongDepth ? 0 : offset;
      circles.push(
        new Circle(
          position.x + localX * cos - localY * sin,
          position.y + localX * sin + localY * cos,
          radius,
        ),
      );
    }
    return circles;
  }

  protected getCurrentFormationData(): UnitFormationTemplate | null {
    if (!this.currentFormation) return null;
    return this.gameDataManager.getUnitTemplateManager().getFormation(this.type, this.currentFormation);
  }

  getAvailableFormations(): UnitFormationTemplate[] {
    return this.gameDataManager.getUnitTemplateManager().getAvailableFormations(this.type);
  }

  getDirectionToPoint(point: Vector2, frontBackArc?: number) {
    if (frontBackArc === undefined) {
      // effectiveFormation (pending ?? current), like the collision OBB and fire
      // emitters, so direction/flank/FF track the formation the unit is forming into.
      const formation = this.gameDataManager.getFormationManager().getTemplate(this.effectiveFormation);
      // frontBackArc is derived from the OBB footprint (circles return 360 -> all Front).
      frontBackArc = degreesToRadians(formation ? getFrontBackArc(formation) : 90);
    }
    return getDirectionToPoint(this.position, point, this.rotation, frontBackArc);
  }

  getFlankMod(attackerPoint: Vector2) {
    const formation = this.gameDataManager.getFormationManager().getTemplate(this.effectiveFormation);
    if (!formation) return 0;
    // Unflankable formations (square, artillery, skirmishers, dispersed, ship) and circles
    // (WW2, no facing) take no flank from any angle. Otherwise the flank ramp is derived
    // from the OBB footprint: wide fronts protect a wide cone, deep ones almost none.
    if (formation.disablesFlankMelee) return 0;
    if (isCircleCollision(getCollisionConfig(formation))) return 0;
    const { min, max } = getFlankAngles(formation);
    const minFlank = degreesToRadians(min);
    const maxFlank = degreesToRadians(max);
    // Defensive: a degenerate footprint would make getFlankingPercent return NaN, which
    // propagates into charge stamina cost and freezes it forever.
    if (!Number.isFinite(minFlank) || !Number.isFinite(maxFlank)) return 0;
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
    const formationTemplate = this.gameDataManager.getFormationManager().getTemplate(this.effectiveFormation);
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
    const categoryTemplate = this.gameDataManager.getUnitCategoryTemplate(this.category);
    return categoryTemplate.routingBehavior?.baseSpeed === "run";
  }

  abstract isMoving(): boolean;
  abstract inMelee(): boolean;
}

