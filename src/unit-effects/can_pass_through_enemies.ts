import { BaseUnit } from "@lob-sdk/unit";
import { BaseUnitEffect } from "./base-unit-effect";
import { UnitEffectDisplayStat } from "./types";
import { UnitEffectRegistry } from "./unit-effect-registry";

export class CanPassThroughEnemies extends BaseUnitEffect {
  static readonly id = 6;
  static readonly name = "can_pass_through_enemies";

  getDisplayStats(unit: BaseUnit): UnitEffectDisplayStat[] {
    return [
      {
        label: "canPassThroughEnemies",
        type: "text",
        color: "green",
      },
    ];
  }
}

// Auto-register when module is loaded
UnitEffectRegistry.register(CanPassThroughEnemies);
