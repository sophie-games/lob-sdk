import { BaseUnit } from "@lob-sdk/unit/base-unit";
import { BaseUnitEffect } from "./base-unit-effect";
import { UnitEffectRegistry } from "./unit-effect-registry";
import { UnitEffectDisplayStat } from "./types";
import { GameDataManager } from "@lob-sdk/game-data-manager";

/**
 * Effect applied when a unit has been running.
 * Used to track recent running movement and affects various unit behaviors.
 */
export class HasRan extends BaseUnitEffect {
  static readonly id = 3;
  static readonly name = "has_ran";

  getDisplayStats(unit: BaseUnit): UnitEffectDisplayStat[] {
    const gameDataManager = GameDataManager.get(unit.era);
    const { stamina } = gameDataManager.getGameRules();

    const stats: UnitEffectDisplayStat[] = [
      {
        label: "unitStat.chargeResistance",
        type: "percentage",
        signed: true,
        value: unit.runChargeResistanceModifier,
        color: unit.runChargeResistanceModifier > 0 ? "red" : "green",
      },
    ];

    if (stamina) {
      stats.push({
        label: "meleeStaminaCost",
        type: "percentage",
        signed: true,
        value: stamina.hasRanMeleeStaminaCostModifier,
        color: stamina.hasRanMeleeStaminaCostModifier > 0 ? "red" : "green",
      });
    }

    return stats;
  }
}

// Auto-register when module is loaded
UnitEffectRegistry.register(HasRan);
