import {
  ScenarioName,
  SkinTier,
  UnitCategoryId,
  UnitType,
} from "@lob-sdk/types";

export type GameEra = "napoleonic" | "ww2";

export type DamageTypeId = number;
export type DamageTypeName = string;

export interface Avatar {
  id: number;
  name: string;
  tier: SkinTier;
  premiumPrice: number;
  discount?: number;
}

export interface ObjectiveSkin {
  id: number;
  name: string;
  tier: SkinTier;
  premiumPrice: number;
  locked?: boolean;
  /** Name of the base sprite */
  base?: string;
  discount?: number;
}

export interface GameDataManagerConfig {
  autoDetectEra?: boolean;
  fallbackToDefault?: boolean;
  cacheEnabled?: boolean;
}

export type BaseSpeed = "walk" | "run";

export interface RoutingBehavior {
  baseSpeed: BaseSpeed;
  /** Whether the unit flees when in Routed state. Defaults to true. */
  fleeWhenRouted?: boolean;
}

export interface EnfiladeFireConfig {
  damageModifier: number;
  orgModifier: number;
}

export interface RearFireConfig {
  orgModifier: number;
}

export type DeploymentSection = "center" | "flank" | "forward" | "front";

export interface UnitCategoryTemplate {
  id: UnitCategoryId;
  /**
   * The deployment section where units of this category should be deployed.
   * Possible values: "flank" (split left/right), "center", "forward", "front"
   * Default value: "center"
   */
  deploymentSection?: DeploymentSection;
  allyCollisionLevel?: number;
  enemyCollisionLevel?: number;
  damageTypeResistances?: Partial<Record<string, number>>;
  firingAltitude: number;
  captureSpeed?: number;
  autofirePriority?: Partial<Record<UnitCategoryId, number>>;
  routingBehavior?: RoutingBehavior;
  enfiladeFire?: EnfiladeFireConfig;
  rearFire?: RearFireConfig;
  /**
   * List of allowed order names for this category.
   */
  allowedOrders?: string[];
  /**
   * The altitude of the unit's hitbox for impact hits.
   * Impact hits weaken the projectile and deal damage.
   */
  impactAltitude?: number;
  /**
   * The altitude of the unit's hitbox for grazing hits.
   * Grazing hits weaken the projectile but don't deal damage.
   */
  grazingAltitude?: number;
}

export interface GameConstants {
  TICKS_PER_TURN: number;
  COLLISION_DETECTION_SUBTICKS: number;
  COLLISION_CHECK_RADIUS: number;

  /**
   * Maximum angle range (in degrees) for push vectors during collisions.
   * When multiple push vectors are applied to a unit, if the angle range between
   * all push vectors exceeds this threshold, the push vectors are not applied.
   *
   * This prevents units from receiving conflicting push forces from multiple directions,
   * which could cause erratic movement. If push vectors are spread too widely (e.g., 90°
   * or more), they cancel each other out and are ignored.
   */
  COLLISION_PUSH_MAX_ANGLE_RANGE_DEGREES: number;

  UNIT_RANGE_MARGIN: number;

  TILE_SIZE: number;

  MAX_RANKED_GAME_TURNS: number;
  MIN_CUSTOM_GAME_MAX_TURNS: number;
  MAX_CUSTOM_GAME_MAX_TURNS: number;
  MIN_OFFLINE_GAME_MAX_TURNS: number;
  MAX_OFFLINE_GAME_MAX_TURNS: number;
  MAX_INACTIVE_TURNS: number;
  TURN_LIMIT_TIME_MARGIN_SECONDS: number;

  ROUT_THRESHOLD_TURNS: number;

  /**
   * Collision level for routing units. This ensures routing units always have
   * a lower collision level than enemies, allowing them to pass through.
   */
  ROUTING_COLLISION_LEVEL: number;

  /**
   * Default map width in tiles.
   */
  DEFAULT_MAP_WIDTH: number;
  /**
   * Default map height in tiles.
   */
  DEFAULT_MAP_HEIGHT: number;
  DEFAULT_DEPLOYMENT_ZONE_WIDTH: number;
  DEFAULT_DEPLOYMENT_ZONE_HEIGHT: number;
  DEFAULT_DEPLOYMENT_ZONE_SEPARATION: number;

  MAX_PLAYERS: number;
  /** 16 ** 2 */
  MIN_FOLLOW_ALLY_DISTANCE_SQUARED: number;
  ALLY_HARD_COLLISION_THRESHOLD: number;

  /** Movement path proximity thresholds */
  /** 4 ** 2 */
  MOVEMENT_PATH_POINT_PROXIMITY_THRESHOLD_SQUARED: number;
  /** ~1.4 ** 2 */
  MOVEMENT_PATH_FINAL_POINT_PROXIMITY_THRESHOLD_SQUARED: number;
  /** (Math.PI / 90) 2 degrees */
  MOVEMENT_PATH_ROTATION_SIMILARITY_THRESHOLD: number;
  /** (Math.PI / 90) 2 degrees */
  MOVEMENT_PATH_FINAL_POINT_ROTATION_SIMILARITY_THRESHOLD: number;

  /** PI / 4 */
  FOLLOW_ROTATION_THRESHOLD: number;
  CAN_LEAVE_MAP_MIN_ORG: number;
  CAN_LEAVE_MAP_MIN_HP_PROPORTION: number;

  ATTACK_COOLDOWN: number;

  CHARGE_RESISTANCE_LOSS_BY_ORG: number;

  MAX_HP_RANGED_ATTACK_PENALTY: number;

  MAX_HP_MELEE_ATTACK_BONUS: number;
  MAX_HP_MELEE_ATTACK_PENALTY: number;

  MAX_DAMAGE_MODIFIER_CLAMP: number;

  NEARBY_UNITS_DISTANCE: number;

  NEARBY_UNITS_CHARGE_RESISTANCE_MODIFIER_CAP: number;
  NEARBY_UNITS_CHARGE_PENETRATION_MODIFIER_CAP: number;

  MIN_EFFECTIVE_VPS: number;

  SHOT_TRAJECTORY_TARGET_ALTITUDE: number;

  OFFER_DRAW_COOLDOWN: number;
  MAX_ENTITY_NAME_LENGTH: number;
  CHARGE_BACKLASH_BASE: number;
  CHARGE_BACKLASH_DEFENDER_CHARGE_BONUS_MULTIPLIER: number;
  CHARGE_BACKLASH_DEFENDER_RESISTANCE_MULTIPLIER: number;
  CHARGE_BACKLASH_ATTACKER_RESISTANCE_OFFSET: number;

  HAS_TAKEN_FIRE_SPEED_MODIFIER: number;

  EFFECT_HAS_RAN_TICKS: number;
  EFFECT_STARTED_ROUTING_TICKS: number;

  DEPLOYMENT_TURN_ADDITIONAL_SECONDS: number;
  /**
   * Maximum angle (in degrees) between a unit's movement direction and the direction
   * toward another unit for the collision to be considered "head-on".
   *
   * Used in collision detection to determine collision response:
   * - If head-on: Unit velocity is set to move directly away from collision point
   * - If not head-on: No collision response (units can pass through each other)
   *
   * Higher values = more collisions treated as head-on = harder for units to pass through
   * Lower values = fewer collisions treated as head-on = easier for units to pass through
   *
   * Example: 81 degrees means collisions are considered head-on when the angle between
   * movement direction and direction to enemy is less than 81 degrees.
   */
  HEAD_ON_COLLISION_ANGLE_DEGREES: number;

  /** 1.5% stamina cost for height changes */
  HEIGHT_CHANGE_STAMINA_COST: number;
  HEIGHT_CHANGE_TICKS: number;
  /** 3% stamina cost for height changes when running */
  HEIGHT_CHANGE_RUNNING_STAMINA_COST: number;
  /** -75% stamina regain penalty when walking */
  WALKING_STAMINA_REGAIN_MODIFIER: number;

  FORWARD_DEPLOYMENT_ZONE_OFFSET: number;

  /**
   * ================================
   * ===== Fog of War constants =====
   * ================================
   */
  FOW_EYE_HEIGHT: number;
  FOW_TARGET_HEIGHT: number;

  /**
   * Not visible.
   */
  FOW_LEVEL_0_DISTANCE: number;

  /**
   * Fully unknown.
   */
  FOW_LEVEL_1_DISTANCE: number;

  /**
   * Partially unknown.
   */
  FOW_LEVEL_2_DISTANCE: number;

  /**
   * Visible without bars.
   */
  FOW_LEVEL_3_DISTANCE: number;

  /**
   * Fully visible.
   */
  FOW_LEVEL_4_DISTANCE: number;

  /**
   * ================================
   * ===== Victory points =====
   * ================================
   */

  /**
   * Starting victory points for each team at the beginning of the game.
   * Both teams start with this base amount, and then additional points are added or subtracted
   * based on objectives captured, loss ratios, and other factors.
   */
  VP_BASE_POINTS: number;

  /**
   * Maximum victory points that can be awarded based on loss ratio comparison.
   * The proportion of casualties (power lost) between teams is compared.
   * The team with fewer casualties receives positive points, while the team with more casualties receives negative points.
   * Points are distributed proportionally based on the difference in loss ratios, up to this maximum value.
   *
   * Example: If this is 10, and Team 1 lost 20% while Team 2 lost 40%, the difference is 20% (0.2),
   * so Team 1 gets +2 points and Team 2 gets -2 points. The maximum of 10 would only be reached if
   * one team lost 0% and the other lost 100% (difference of 1.0).
   */
  VP_LOSS_RATIO_POINTS: number;

  /**
   * Margin of victory points used to determine the winner when the max turn limit is reached.
   * A team is defeated if their VP difference (their points minus opponent's points) plus this value <= 0.
   * A team can be behind by up to this many points and still avoid defeat; otherwise they lose and the game ends.
   *
   * Example: If this is 10, Team 1 with 45 points vs Team 2 with 50 points: -5 + 10 = 5 > 0, so it's a tie.
   * But if Team 1 had 40 points: -10 + 10 = 0 <= 0, so Team 1 is defeated.
   */
  VP_POINTS_TO_TIE_BREAK: number;

  /**
   * Default victory points awarded for capturing a big objective.
   * Used when an objective doesn't have custom victory points explicitly set.
   * Big objectives are typically more strategically important than small objectives.
   */
  VP_BIG_DEFAULT_POINTS: number;

  /**
   * Default victory points awarded for capturing a small objective.
   * Used when an objective doesn't have custom victory points explicitly set.
   * Small objectives typically award fewer points than big objectives.
   */
  VP_SMALL_DEFAULT_POINTS: number;

  /**
   * Base value for calculating victory points penalty from ticks under pressure.
   * The penalty is calculated as: -(ticksUnderPressure * (VP_TICKS_UNDER_PRESSURE_BASE / TICKS_PER_TURN))
   * This represents the base VP penalty per tick. When divided by TICKS_PER_TURN, it gives the VP penalty per turn.
   *
   * Example: If this is 0.5 and TICKS_PER_TURN is 16, the penalty is 0.5/16 = 0.03125 VP per tick, or 0.5 VP per turn.
   */
  VP_TICKS_UNDER_PRESSURE_BASE: number;

  PRESET_SCENARIO_ELO_K_FACTOR: number;
  /** Multiplier for ELO K factor in cancelled ranked games (e.g., 0.5 = 50% of normal K factor) */
  CANCELLED_RANKED_GAME_ELO_K_FACTOR_MULTIPLIER: number;

  /** Experience required to reach level 2 */
  PLAYER_EXPERIENCE_BASE: number;
  /** Experience factor for each level */
  PLAYER_EXPERIENCE_FACTOR: number;

  INITIAL_ELO: number;

  UNKNOWN_UNIT_TYPE: UnitType;
  DEFAULT_SCENARIO: ScenarioName;

  /**
   * Routing units will switch to this formation when they start routing.
   */
  ROUTING_FORMATION: string;
}

// Damage Type Types (moved from @common/damage-type)

export interface CircularAoEConfig {
  type: "circular";
  ranges: {
    start: number;
    end: number;
    startRadius: number;
    endRadius: number;
  }[];
  edgeDamageModifier: number;
  absorptionModifier?: number;
}

export interface TrapezoidalAoeConfig {
  type: "trapezoidal";
  ranges: {
    start: number;
    end: number;
    startTopWidth: number;
    endTopWidth: number;
    startBottomWidth: number;
    endBottomWidth: number;
    startHeight: number;
    endHeight: number;
  }[];
  absorptionModifier?: number;
  offset?: number;
  elevationModifiers?: {
    heightModifierPerLevel: number; // Height modifier per elevation difference > 1 (negative = reduction)
    damageModifierPerLevel: number; // Damage modifier per elevation difference > 1 (negative = reduction)
    maxElevationDiff: number; // Maximum elevation difference to apply modifiers
  };
}

export type AoeConfig = CircularAoEConfig | TrapezoidalAoeConfig;

export interface MeleeDamageTypeTemplate {
  id: number;
  name: string;
  ranged?: false;
  damageModifier?: number;
  orgDamageRatio: number;
  cannotChargeAgainst?: UnitCategoryId[];
  reorgDebuff?: number;
  attackEffectDuration?: number;
}

export interface DamageTypeRange {
  start: number;
  end: number;
  startMod: number;
  endMod: number;
  name?: string;
}

export interface RangedDamageTypeTemplate {
  id: number;
  name: string;
  ranged: true;
  projectileWidth: number;
  damageModifier?: number;
  orgDamageRatio: number;
  diminishByTargetOrg?: {
    start: number;
    end: number;
    modifier: number;
  };
  ranges: DamageTypeRange[];
  arcHeight?: number;
  areaOfEffect: AoeConfig;
  enfiladeFire?: boolean;
  cannotUseAfterRun?: boolean;
  projectilePenetration?: number;
  shotSound: string;
  shotAnim: string;
  shotImpactAnim?: string;
  ammoCost?: number;
  reorgDebuff?: number;
  attackEffectDuration?: number;
  extendRange?: boolean;
}

export type DamageTypeTemplate =
  | MeleeDamageTypeTemplate
  | RangedDamageTypeTemplate;

// Game Rules Types

export interface FlankingRule {
  meleeOrgDamageModifier: number;
  rearMeleeOrgDamageModifier: number;
  chargePenetrationModifier: number;
  rearChargePenetrationModifier: number;
}

export interface StaminaRule {
  meleeTurnCost: number;
  rangedTurnCost: number;
  hasRanMeleeStaminaCostModifier: number;
  regainRates: {
    range1: number;
    range2: number;
    range3: number;
    range4: number;
    range5: number;
  };
  upperModifierLimit: number;
  lowerModifierLimit: number;
  chargeResistanceModifier: number;
  runningMovementPenalty: number;
  rangedAttackPenalty: number;
  meleeAttackPenalty: number;
  meleeDefensePenalty: number;
}

export interface AmmoRule {
  baseReserve: number;
  regenerationBaseRate: number;
  regenerationBonusRate: number;
}

export interface SkirmishersRule {
  /** Unit Type Id of the skirmisher unit */
  unitType: number;
}

export interface SupplyLinesRule {
  /** Terrain type IDs that are considered roads (e.g., [3, 7, 15] for Road, Bridge, RoadWinter) */
  roadTerrainTypes?: number[];
  /** Radius of influence around units for supply line calculations (in tiles) */
  influenceRadius: number;
  /** Radius around supply hubs (small objectives) where units can receive supply (in tiles) */
  supplyHubRadius: number;
  /** Maximum radius around supply hubs where units can receive supply when under friendly influence (in tiles) */
  supplyHubRadiusWithInfluence: number;
  /** Default logistics an objective provides per turn */
  defaultLogistics: number;
  /** Default manpower per turn generated by big objectives. If not set, defaults to 0 */
  defaultManpowerPerTurn?: number;
  /** Default gold per turn generated by big objectives. If not set, defaults to 0 */
  defaultGoldPerTurn?: number;
  /** HP attrition rate (0-1) applied per turn when unit supply is below lowerModifierLimit. Defaults to 0.05 */
  noSupplyHpAttrition?: number;
  /** Organization attrition rate (0-1) applied per turn when unit supply is below lowerModifierLimit. Defaults to 0.05 */
  noSupplyOrgAttrition?: number;
  /** Manpower cost per supply point provided. If not set, supply is free */
  supplyManpowerCost?: number;
  /** Gold cost per supply point provided. If not set, supply is free */
  supplyGoldCost?: number;
  /** Reinforcement rate (0-1) applied per turn. Defaults to 0.02 */
  reinforcementRate?: number;
}

export interface EntrenchmentRule {
  /** Ranges for visual representation of entrenchment levels */
  ranges: Array<{ min: number; max: number; color: string }>;
  /** Melee attack bonus per entrenchment level */
  meleeAttackBonusPerLevel: number;
  /** Melee defense bonus per entrenchment level */
  meleeDefenseBonusPerLevel: number;
  /** Push strength modifier per entrenchment level (multiplicative, e.g., 0.1 means 10% increase per level) */
  pushStrengthModifierPerLevel: number;
}

export interface ObjectivesRule {
  /** Capture radius around objectives (in world units) */
  radius: number;
  /** Minimum pressure threshold (0-1). If the team has less than this
   * proportion of the non-neutral objective victory points, the team
   * will start being under pressure.
   */
  pressureThreshold: number;
}

export interface AllyCollisionRule {
  collisionBounceScale: number;
  overlapStopCharge: number;
  maxSpeedPenalty: number;
  maxOrgDamageReceived: number;
  maxMeleeAttackPenalty: number;
  maxRangedAttackPenalty: number;
  upperModifierLimit: number;
  lowerModifierLimit: number;
  maxOrgRadiusModifier: number;
}

export interface TutorialRule {
  /** List of scenario names to show in the tutorials page */
  scenarios: ScenarioName[];
}

export interface OrganizationRule {
  /** Speed modifier applied based on organization level */
  speedModifier: number;
  /** Minimum HP proportion required for max org debuff to apply */
  maxOrgDebuffMinHpProportion: number;
  /** Maximum organization debuff based on HP */
  maxOrgDebuffHp: number;
  /** Maximum organization debuff based on stamina */
  maxOrgDebuffStamina: number;
  /** High stamina proportion threshold for org debuff calculation */
  maxOrgDebuffStaminaHighProportion: number;
  /** Low stamina proportion threshold for org debuff calculation */
  maxOrgDebuffStaminaLowProportion: number;
  /** Maximum ranged attack penalty when organization is low */
  maxOrgRangedAttackPenalty: number;
  /** Maximum melee attack bonus when organization is high */
  maxOrgMeleeAttackBonus: number;
  /** Maximum melee attack penalty when organization is low */
  maxOrgMeleeAttackPenalty: number;
  /** Base organization regain rate per turn (as proportion of max org) */
  regainRate: number;
  /**
   * Organization proportion threshold (0-1) at which units shatter. When unit.org <= maxOrg * shatterOrgThreshold, unit shatters
   * Shattering is when the unit is disorganized enough to be destroyed permanently.
   */
  shatterOrgThreshold: number;
  /** Organization proportion threshold (0-1) at which units enter Routed state. When unit.org <= maxOrg * routedOrgThreshold, unit enters Routed state */
  routedOrgThreshold: number;
  /** Organization proportion threshold (0-1) at which units enter Recovering state. When unit.org >= maxOrg * recoverOrgThreshold, unit enters Recovering state */
  recoverOrgThreshold: number;
  /**
   * Organization proportion threshold (0-1) at which units rally. When unit.org >= maxOrg * rallyOrgThreshold, unit rallies
   * Rallying is when the unit is organized enough to be able to receive orders again.
   */
  rallyOrgThreshold: number;
  /** Upper limit for organization-based modifiers (as proportion, e.g., 0.9 = 90%) */
  upperModifierLimit: number;
  /** Lower limit for organization-based modifiers (as proportion, e.g., 0.4 = 40%) */
  lowerModifierLimit: number;
  /** Distance (in world units) to consider units as "nearby" for organization radius effects */
  nearbyUnitsDistance: number;
  /** Maximum positive organization bonus from nearby units */
  nearbyUnitsPositiveOrgBonusCap: number;
  /** Maximum negative organization penalty from nearby units */
  nearbyUnitsNegativeOrgBonusCap: number;
  /** Maximum organization damage modifier from nearby units */
  nearbyUnitsOrgDamageModifierCap: number;
  /** Organization bonus multiplier for routing units within organization radius */
  routingUnitNearbyUnitsOrgBonus: number;
  /** Organization radius modifier applied when unit has StartedRouting effect */
  startedRoutingOrgRadiusModifier: number;
  /** HP loss reduction factor for organization radius bonus (0-1, where 1 = full reduction at 0% HP) */
  orgRadiusBonusHpLossReduction: number;
  /** Organization recovery modifier when unit is in a safe area (no nearby enemies) */
  safeOrgRecoveryModifier: number;
  /** Distance (in world units) to consider a unit as "safe" (no enemies within this range) */
  safeDistance: number;
  /** Organization recovery modifier when unit has distant threats (enemies beyond nearbyUnitsDistance but within distantThreatDistance) */
  distantThreatOrgRecoveryModifier: number;
  /** Distance (in world units) to consider threats as "distant" (beyond nearbyUnitsDistance but within this range) */
  distantThreatDistance: number;
  /** Organization recovery modifier when unit is routing */
  routingOrgRecoveryModifier: number;
  /** Maximum organization recovery modifier based on HP proportion (negative value reduces recovery at low HP) */
  maxOrgRecoveryByHpModifier: number;
  /** Max VP ratio difference below which no organization modifier is applied */
  vpRatioDebuffThreshold: number;
  /** Multiplier for victory points-based organization modifier calculation */
  vpModifierMultiplier: number;
}

export interface GameRules {
  flanking?: FlankingRule;
  stamina?: StaminaRule;
  ammo?: AmmoRule;
  skirmisherSpawning?: SkirmishersRule;
  supplyLines?: SupplyLinesRule;
  entrenchment?: EntrenchmentRule;
  objectives: ObjectivesRule;
  organization: OrganizationRule;
  allyCollision?: AllyCollisionRule;
  tutorial?: TutorialRule;
}

export interface UnitSkin {
  id: number;
  name: string;
  /**
   * Formation-specific sprites. Each formation must define its own base and overlay sprites.
   */
  formations: {
    [formationId: string]: {
      /** Name of the base sprite */
      base?: string;
      /** Name of the overlay sprite */
      overlay?: string | null;
    };
  };
  tier: SkinTier;
  premiumPrice: number;
  unitType: UnitType;
  scale?: number;
  attackColor?: string;
  locked?: boolean;
  discount?: number;
}

export interface MapSizeTemplate {
  map: { tilesX: number; tilesY: number };
  deployment: { tilesX: number; tilesY: number; zoneSeparation: number };
}
