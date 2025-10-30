export interface FiringArc {
  /**
   * Direction of the firing arc in radians, relative to the unit's rotation.
   * 0 = front, π/2 = right, π = back, -π/2 = left
   */
  direction: number;
  /**
   * Angle of the firing arc in radians (half-angle on each side of direction).
   * For example, π/2 means 90 degrees total (45 degrees on each side).
   */
  angle: number;
}

export interface FormationTemplate {
  id: string;
  frontBackArcRadians: number;

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
   * Custom firing arcs for this formation.
   * If defined, replaces the default firing angle calculation.
   * Each arc defines a direction and angle relative to the unit's rotation.
   */
  firingArcs?: FiringArc[];
}
