import { Point2, Vector2 } from "@lob-sdk/vector";
import { EntityId } from ".";

/**
 * Effects must have the effect id as the first element,
 * and the duration as the second element. Some effects may require
 * additional arguments.
 *
 * [effectId, duration, ...args]
 */
export type UnitEffectDto = Array<number>;

export enum UnitEffectId {
  Rotated180 = 1,
  BeenInMelee = 2,
  HasRan = 3,
  StartedRouting = 4,
  TakenFire = 5,
  HasFired = 6,
}

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
  id: string;
  /**
   * Base sprite name for this formation. This can vary by unit type.
   */
  baseSprite: string;
  /**
   * Overlay sprite name for this formation. This can vary by unit type.
   */
  overlaySprite?: string;
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
  stamina: number | null;
  supply?: number | null;
  /**
   * Supply consumption per turn for this unit.
   * Defaults to 0 if not specified.
   */
  supplyConsumption?: number;
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

export interface IUnit {
  id: EntityId;
  player: number;
  team: number;
  template: UnitTemplate;
  position: Vector2;
  currentFormation: string;
  pendingFormationId: string | null;
  /**
   * Remaining ticks for formation change. Formation changes cannot last more
   * than 1 turn.
   */
  formationChangeTicksRemaining: number;

  supply: number | null;
  /**
   * Supply consumption per turn for this unit.
   * Defaults to 0 if not specified.
   */
  supplyConsumption?: number;
}
