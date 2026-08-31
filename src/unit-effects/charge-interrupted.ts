import { BaseUnit } from "@lob-sdk/unit";
import { BaseUnitEffect } from "./base-unit-effect";
import { UnitEffectRegistry } from "./unit-effect-registry";
import { UnitEffectDisplayStat } from "./types";

/**
 * Prevents a unit from charging for a fixed number of simulation ticks without
 * affecting its movement or formation.
 */
export class ChargeInterrupted extends BaseUnitEffect {
  static readonly id = 7;
  static readonly name = "charge_interrupted";

  onAdded(unit: BaseUnit): void {
    unit.cannotCharge = true;
  }

  onTickStart(unit: BaseUnit): void {
    unit.cannotCharge = true;
  }

  getDisplayStats(unit: BaseUnit): UnitEffectDisplayStat[] {
    return [
      {
        label: "cannotCharge",
        type: "text",
        color: "red",
      },
    ];
  }
}

UnitEffectRegistry.register(ChargeInterrupted);
