export interface FiringArc {
  /**
   * Angle of the firing arc in degrees, centered at the front of the unit.
   * For example, 90 means 90 degrees total (45 degrees on each side of the front).
   * 360 means full circle (can fire in all directions).
   * Stored in degrees in game data JSON files.
   */
  angle: number;
  /**
   * Limit on the number of discrete firing directions the arc can engage within a full rotation (360 degrees).
   * This determines the damage multiplier (1 / multiTargetLimit) and snap behavior.
   * For example, 4 means the arc can shoot in 4 directions (every 90 degrees), dealing 1/4 damage each.
   */
  multiTargetLimit?: number;
}

export interface FormationTemplate {
  id: string;
  frontBackArc: number;

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
   * Custom firing arc for this formation.
   * If defined, replaces the default firing angle calculation.
   * The arc is centered at the front of the unit (0 degrees relative to unit rotation).
   */
  firingArc?: FiringArc;
}

export type EntityId = number;

export * from "./order";
