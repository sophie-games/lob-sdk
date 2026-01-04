import { Point2, Vector2 } from "@lob-sdk/vector";
import { EntityId } from "@lob-sdk/types";

/**
 * Effects must have the effect id as the first element,
 * and the duration as the second element. Some effects may require
 * additional arguments.
 *
 * [effectId, duration, ...args]
 */
export type UnitEffectDto = Array<number>;

export interface UnitDto {
  id: EntityId;
  name?: string;
  hp?: number;
  org?: number;
  /**
   * Stamina.
   */
  st?: number;
  /**
   * Ammo.
   */
  am?: number;
  /**
   * Supply.
   */
  su?: number;
  status?: UnitStatus;
  /**
   * Position.
   */
  pos: Point2;
  player: number;
  rotation: number;

  type: UnitType;

  /**
   * Last velocity.
   */
  lv?: [number, number];

  /**
   * Effects
   */
  eff?: UnitEffectDto[];

  /**
   * Accumulated movement ticks.
   */
  ac?: number;

  /**
   * Attack Cooldown
   */
  acd?: number;

  /**
   * Previous height
   */
  ph?: number;

  /**
   * Previous height ticks
   */
  pht?: number;

  /**
   * Hold fire damage types (disabled for autofire)
   */
  hfdt?: number[];

  /**
   * Current formation
   */
  f?: string;

  /**
   * Entrenchment level.
   */
  en?: number;

  /**
   * Stopped ticks.
   */
  stt?: number;
}

export interface UnitDtoPartialId extends Omit<UnitDto, "id"> {
  id?: EntityId;
}

export enum UnitStatus {
  /** Standing units can receive orders and fight normally */
  Standing = 1,
  /** Routing units cannot receive orders and they will flee if possible */
  Routing = 2,
  /** Recovering units cannot receive orders but they will keep fighting */
  Recovering = 3,
}

/**
 * This is the number that represents the unit type defined in the unit templates JSON file.
 */
export type UnitType = number;

/**
 * This is the string that represents the unit category defined in the unit categories JSON file.
 */
export type UnitCategoryId = string;

export interface UnitFormationTemplate {
  /** Formation ID */
  id: string;
  /**
   * Base sprite name for this formation. This can vary by unit type.
   */
  baseSprite: string;
  /**
   * Overlay sprite name for this formation. This can vary by unit type.
   */
  overlaySprite?: string;
  /**
   * Change animations for this unit type.
   * The key is the formation ID, and the value is the animation name.
   */
  changeAnimations?: Record<string, string>;
}

interface BaseUnitTemplate {
  name: string;
  type: UnitType;
  category: UnitCategoryId;
  meleeAttack: number;
  meleeDefense: number;
  meleeDamageType: string;
  chargeBonus: number;
  chargePenetration?: number;
  walkMovement: number;
  runStartUpMovement?: number;
  runMovement: number;
  timeToRun: number;
  runCost: number;
  startsRunning?: boolean;
  hp: number;
  org: number;
  stamina?: number;
  supply?: number;
  /**
   * Supply consumption when unit is idle (not moving or fighting).
   */
  supplyConsumptionIdle?: number;
  /**
   * Supply consumption when unit is moving.
   */
  supplyConsumptionMoving?: number;
  /**
   * Supply consumption when unit is in combat.
   */
  supplyConsumptionCombating?: number;
  /**
   * Manpower cost per supply point provided to this unit.
   * If not set, uses the global supplyManpowerCost from SupplyLinesRule.
   */
  supplyManpowerCost?: number;
  /**
   * Gold cost per supply point provided to this unit.
   * If not set, uses the global supplyGoldCost from SupplyLinesRule.
   */
  supplyGoldCost?: number;
  orgRadius: number;
  orgRadiusBonus: number;
  movementSound: string;
  manpower: number;
  gold: number;
  chargeResistance?: number;
  runChargeResistanceModifier?: number;
  /**
   * Base pushing strength for collision calculations.
   * Determines how strongly this unit can push other units during collisions.
   * Defaults to 40 for most units, 10 for type 1 (line infantry).
   */
  pushStrength?: number;
  /**
   * Distance in pixels that this unit can push
   * another unit during collisions.
   */
  pushDistance?: number;
  basicPrice?: number;
  premiumPrice?: number;
  locked?: boolean;
  hasSkirmishers?: boolean;
  canDeployForward?: boolean;

  /**
   * Custom visibility range in tiles for this unit.
   * If set, this unit will only be visible to enemies within this distance.
   * Units with this property are always fully visible when in range (no partial visibility).
   *
   * Examples:
   * - reducedVisibilityRange: 16 (skirmishers - only visible at 16 tiles)
   *
   * If not set, uses the standard fog of war distances.
   */
  reducedVisibilityRange?: number;
  unknownType?: UnitType;

  /**
   * Base rotation speed for this unit type.
   */
  rotationSpeed: number;
  /**
   * Maximum rotation threshold before speed penalty is applied.
   */
  rotationMaxThreshold: number;
  /**
   * Rotation speed when running.
   */
  runRotationSpeed: number;
  /**
   * Turning delay in ticks.
   */
  turningDelay?: number;

  reportStats?: { [key: string]: number };

  /**
   * If true, the sprite of the unit will not rotate.
   */
  disableSpriteRotation?: boolean;

  /**
   * Formations available for this unit type.
   * All units must have at least one formation.
   */
  formations: UnitFormationTemplate[];

  /**
   * Default formation for this unit type.
   */
  defaultFormation: string;

  /**
   * Max entrenchment level.
   */
  maxEntrenchment?: number;
}

export interface RangeUnitTemplate extends BaseUnitTemplate {
  rangedAttack: number;
  rangedDamageTypes: string[];
  fireWhileMoving?: boolean;
  /** Min distance to fire and advance */
  minDistanceToFAA?: number;
  /** Ammo system properties for artillery */
  ammo?: number;
}

export type UnitTemplate = Readonly<BaseUnitTemplate | RangeUnitTemplate>;
export type UnitTemplates = Record<UnitType, UnitTemplate>;

/**
 * Points used to check what terrain the unit is on.
 * Each point has an offset relative to the formation center and a weight
 * that determines how much that point influences the terrain check.
 * If not specified, defaults to checking only at the unit's center position.
 */
export interface FormationCheckPoint {
  /** Offset in pixels relative to formation center */
  x: number;
  /** Offset in pixels relative to formation center */
  y: number;
  /** Integer weight (higher = more influence) */
  weight: number;
}

export interface FormationCheckPointWithProportion extends FormationCheckPoint {
  proportion: number;
}

export interface FormationTemplate {
  id: string;
  frontBackArc: number;

  /**
   * Number of collision circles for this formation.
   */
  collisionCircles: number;
  /**
   * Size of each collision circle in pixels.
   */
  collisionCircleSize: number;
  /**
   * Distance between collision circles. Defaults to collisionCircleSize if not specified.
   */
  collisionCircleDistance?: number;
  /**
   * If true, collision circles are arranged vertically (along X axis).
   * If false or undefined, collision circles are arranged horizontally (along Y axis).
   * Defaults to false (horizontal).
   */
  collisionCirclesVertical?: boolean;
  /**
   * Points used to check what terrain the unit is on.
   * Each point has an offset relative to the formation center and a weight
   * that determines how much that point influences the terrain check.
   * If not specified, defaults to checking only at the unit's center position.
   */
  checkPoints?: Array<FormationCheckPoint>;

  movementModifier?: number;
  rotationSpeedModifier?: number;
  rangedAttackModifier?: number;
  chargeBonusModifier?: number;
  chargePenetrationModifier?: number;
  chargeResistanceModifier?: number;
  pushStrengthModifier?: number;

  disablesFlankMelee?: boolean;
  disablesRearMelee?: boolean;
  disablesEnfiladeRearFire?: boolean;

  flankChargeResistance?: number;
  rearChargeResistance?: number;

  enfiladeFireResistance?: number;
  rearFireResistance?: number;

  rangedDamageResistance?: number;
  rangedOrgResistance?: number;

  /**
   * The shooting angle is the angle in degrees that the unit can shoot at.
   * Default is 90.
   */
  shootingAngle?: number;

  /**
   * The maximum number of targets that the unit can shoot at.
   * Default is 1.
   */
  shootingMaxTargets?: number;

  /**
   * The angle margin is the minimum angle difference there must be
   * between the current target and the rest of the targets to be shot.
   * Default is 0.
   */
  shootingAngleMargin?: number;

  /**
   * The damage will be split by the number of sides or the number of shots,
   * whichever is greater. Default is 1.
   */
  shootingSides?: number;

  /**
   * Time in ticks to form this formation.
   */
  timeToForm?: number;

  /**
   * Time in ticks to unform from this formation.
   */
  timeToUnform?: number;

  /**
   * Speed modifier when a unit is changing to this formation.
   */
  formingSpeedModifier?: number;

  /**
   * Modifier for the damage received by a unit when it is in this formation.
   * Default is 0.
   */
  receivedMeleeDamageModifier?: number;

  /**
   * Minimum movement modifier for this formation.
   * Default is 0.
   */
  minMovementModifier?: number;

  /**
   * Damage types that this formation is immune to from friendly fire.
   */
  friendlyFireImmuneDamageTypes?: string[];

  /**
   * Projectile pass through value for this formation (0-1).
   * Higher values mean projectiles pass through with less damage reduction.
   */
  projectilePassThrough?: number;

  /**
   * Effects applied when a unit switches to this formation.
   */
  effects?: Array<{
    name: string;
    duration: number;
    args?: number[];
  }>;
}

export type UnitCounts = Record<UnitType, number>;
