import { Point2, Vector2 } from "@lob-sdk/vector";
import { EntityId } from "@lob-sdk/types";
import type { EngagementRange } from "@lob-sdk/game-data-manager";

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
   * Remaining charge-interruption ticks. Kept outside `eff` so older clients
   * and servers can safely ignore this newer temporary state.
   */
  ci?: number;

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
   * Autofire engagement-range tier (EngagementRange). Omitted when `Max` (the default).
   */
  afr?: EngagementRange;

  /**
   * Current formation
   */
  f?: string;

  /**
   * Pending formation id, set while a formation change is in progress.
   */
  pf?: string;

  /**
   * Remaining ticks until the pending formation change completes.
   */
  pft?: number;

  /**
   * Entrenchment level.
   */
  en?: number;

  /**
   * Stopped ticks.
   */
  stt?: number;

  /**
   * Bars Hidden
   */
  bh?: boolean;

  /**
   * Routing at a safe distance: no enemy within `safeDistance` and no recent fire.
   * Such a router walks instead of running. Omitted when false.
   */
  rs?: boolean;
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
  flankMeleeOrgModifier?: number;
  flankChargePenBonus?: number;
  walkMovement: number;
  runStartUpMovement?: number;
  runMovement: number;
  timeToRun: number;
  unlimberTime?: number;
  runCost: number;
  startsRunning?: boolean;
  hp: number;
  org: number;
  /**
   * Absolute organization value at which this unit shatters.
   */
  shattersAtOrg: number;
  /**
   * Absolute organization value at which this unit routes.
   */
  routesAtOrg: number;
  /**
   * Absolute organization value at which this unit recovers from routing.
   */
  recoversAtOrg: number;
  /**
   * Absolute organization value at which this unit rallies.
   */
  ralliesAtOrg: number;
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
  /** Looping movement sound used at run pace. Falls back to movementSound. */
  runMovementSound?: string;
  chargeSound?: string;
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
  skirmisherRatio?: number;
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
   * Maximum rotation threshold before the running speed penalty is applied.
   * Defaults to rotationMaxThreshold when omitted.
   */
  runRotationMaxThreshold?: number;
  /**
   * Rotation speed when running.
   */
  runRotationSpeed: number;
  /**
   * Turning delay in ticks.
   */
  turningDelay?: number;

  reportStats?: { [key: string]: number | undefined };

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
  /** Disable ammo regen for the unit (eg. rockets) */
  noAmmoRegain?: boolean;
  /** Units with this property will fire at the closest unit instead of ordered target with the shoot order */
  panicFireDistance?: number;
}

export type UnitTemplate = Readonly<BaseUnitTemplate | RangeUnitTemplate>;
export type UnitTemplates = Record<UnitType, UnitTemplate>;

/** Discriminates a collision footprint. Value 0 remains reserved for legacy circles. */
export enum CollisionShapeType {
  Obb = 1,
}

/**
 * A formation's rotated-rectangle collision footprint. Resolve it through
 * `getCollisionConfig`, which upgrades legacy radius-based inputs to square OBBs.
 */
export interface CollisionShapeConfig {
  type: CollisionShapeType.Obb;
  frontage: number;
  depth: number;
}

/**
 * A ranged-fire emitter mounted on one edge of the unit's OBB (edge-fire model).
 * Edge index follows the OBB corner order: 0 = -Y side, 1 = +X front,
 * 2 = +Y side, 3 = -X back.
 */
export interface FireEdge {
  edge: number;
  /** Fire arc in degrees (full angle), centred on the edge's outward normal. Default 90. */
  arc?: number;
  /**
   * Number of fire emitters along this edge (also the per-edge target cap). Required
   * and explicit: it is the firepower and the simultaneous-target capacity, so it is
   * always pinned per formation rather than derived from the edge length.
   */
  emitters: number;
}

/**
 * How a formation's firepower is split across its fire edges. `Shared` (default): one
 * pool for the whole unit, divided among all emitters (an infantry square's four faces
 * each fire a fraction). `PerEdge`: each edge is its own full pool (a ship's port and
 * starboard broadsides each fire a complete volley).
 */
export enum FirepowerPooling {
  Shared,
  PerEdge,
}

export interface FormationTemplate {
  id: string;

  /**
   * The rotated-rectangle collision footprint. Read it through `getCollisionConfig`,
   * which also upgrades older custom-scenario formations that used a radius or the
   * deprecated flat frontage/depth and collision-circle fields.
   */
  collisionShape?: CollisionShapeConfig;

  /**
   * Collision strength vs allies / enemies, compared pairwise via `checkCollision`:
   * `-1` (NO_COLLISION_LEVEL) is soft overlap / pass-through (skirmishers, artillery),
   * `0`+ are solid tiers that block an equal-or-lower level. Unset defaults to solid.
   * Read through the unit's `allyCollisionLevel` / `enemyCollisionLevel` getters.
   */
  allyCollisionLevel?: number;
  enemyCollisionLevel?: number;

  movementModifier?: number;
  runMovementModifier?: number;
  rotationSpeedModifier?: number;
  disable180Turnaround?: boolean;
  rangedAttackModifier?: number;
  chargeBonusModifier?: number;
  chargePenetrationModifier?: number;
  chargeResistanceModifier?: number;
  pushStrengthModifier?: number;

  disablesFlankMelee?: boolean;
  disablesEnfiladeFire?: boolean;
  disablesRearFire?: boolean;

  flankChargeResistance?: number;
  rearChargeResistance?: number;

  enfiladeFireResistance?: number;
  rearFireResistance?: number;

  rangedDamageResistance?: number;
  rangedOrgResistance?: number;

  /**
   * OBB edges that emit ranged fire (edge-fire model). A formation with no fire edges
   * fires a default single front edge.
   */
  fireEdges?: FireEdge[];

  /**
   * How firepower is split across the fire edges. Default `Shared` (one pool for the
   * whole unit, an infantry square's faces each at a fraction); `PerEdge` gives each
   * edge its own full pool (a ship's port/starboard broadsides each a complete volley).
   */
  firepowerPooling?: FirepowerPooling;

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
   * Rank of this formation when the draw-line control arranges a mixed selection
   * into role-based ranks (lower = closer to the front of the drawn line). Units
   * are grouped by this value and stacked front-to-back; empty ranks collapse, so a
   * uniform selection lays out like a plain line. Unset sorts to the back. Because
   * formation ids do not overlap across unit classes, this doubles as a per-class
   * layer (e.g. `skirmish` ahead of `line`).
   */
  drawLineRank?: number;

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
