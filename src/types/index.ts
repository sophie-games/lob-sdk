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
}

export type EntityId = number;

export * from "./order";
