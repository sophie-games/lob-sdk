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
}

export type EntityId = number;

export * from "./order";
export * from "./unit";
export * from "./objective";

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
