import { BaseUnitEffect } from "./base-unit-effect";
import { UnitEffectDisplayStat } from "./types";
import { UnitEffectRegistry } from "./unit-effect-registry";
import { BaseUnit } from "@lob-sdk/unit";

/**
 * Effect that keeps a unit stopped while a 180-degree turnaround is pending.
 * Duration is typically set to the unit's turningDelay property.
 */
export class Rotated180 extends BaseUnitEffect {
  static readonly id = 1;
  static readonly name = "rotated_180";

  constructor(
    duration: number,
    public readonly targetRotation?: number,
  ) {
    super(duration);
  }

  override toDto(): number[] {
    return this.targetRotation === undefined
      ? super.toDto()
      : [this.id, this.duration, this.targetRotation];
  }

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
