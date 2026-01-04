import { BaseUnitEffect } from "./base-unit-effect";

export interface UnitEffectDisplayStat {
  label: string;
  type: "percentage" | "text";
  signed?: boolean;
  value?: number | string;
  color?: "red" | "green";
}

/**
 * Type for unit effect constructors that must accept duration as first parameter
 * and may accept additional parameters of any type.
 *
 * Note: We use `args[]` for rest parameters because different effect classes
 * have different constructor signatures that cannot be known at compile time.
 * The first parameter (duration) is still type-safe, and the registry ensures
 * correct instantiation at runtime.
 */
export type UnitEffectConstructor = new (
  duration: number,
  ...args: number[]
) => BaseUnitEffect;
