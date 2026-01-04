import { BaseUnitEffect } from "./base-unit-effect";
import { UnitEffectDisplayStat } from "./types";
import { UnitEffectRegistry } from "./unit-effect-registry";
import { BaseUnit } from "@lob-sdk/unit";

/**
 * Effect that causes a unit to fully stop when rotating 180 degrees.
 * Duration is typically set to the unit's turningDelay property.
 */
export class Rotated180 extends BaseUnitEffect {
  static readonly id = 1;
  static readonly name = "rotated_180";

  getDisplayStats(unit: BaseUnit): UnitEffectDisplayStat[] {
    return [
      {
        label: "cannotMove",
        type: "text",
        color: "red",
      },
    ];
  }
}

// Auto-register when module is loaded
UnitEffectRegistry.register(Rotated180);
