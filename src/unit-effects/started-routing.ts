import { BaseUnit } from "@lob-sdk/unit";
import { BaseUnitEffect } from "./base-unit-effect";
import { UnitEffectDisplayStat } from "./types";
import { UnitEffectRegistry } from "./unit-effect-registry";
import { GameDataManager } from "@lob-sdk/game-data-manager";

/**
 * Effect applied when a unit has started routing.
 * Used to track units that have recently begun routing and affects recovery behavior.
 */
export class StartedRouting extends BaseUnitEffect {
  static readonly id = 4;
  static readonly name = "started_routing";

  merge(other: StartedRouting): void {
    if (other.duration > this.duration) {
      this.duration = other.duration;
    }
  }

  getDisplayStats(unit: BaseUnit): UnitEffectDisplayStat[] {
    const gameDataManager = GameDataManager.get(unit.era);
    const { organization } = gameDataManager.getGameRules();

    return [
      {
        label: "unitStat.orgRadiusBonus",
        type: "percentage",
        value: organization.startedRoutingOrgRadiusModifier,
        color:
          organization.startedRoutingOrgRadiusModifier < 0 ? "red" : "green",
      },
      {
        label: "unitStat.orgRadiusBonus",
        type: "text",
        value: -5, // todo make configurable
        color: "red",
      },
      {
        label: "unitStat.orgRadius",
        type: "text",
        value: organization.startedRoutingOrgRadiusDistance,
        color: "red",
      },
      {
        label: "unitStat.movement",
        type: "percentage",
        value: organization.startedRoutingOrgRadiusDistanceRunSpeedBonus,
        color: "green",
      },
      {
        label: "unitStat.runCost",
        type: "percentage",
        value: organization.startedRoutingRunCostModifier,
        color: "red",
      },
    ];
  }

  getOrgRadiusValue(unit: BaseUnit): number {
    const gameDataManager = GameDataManager.get(unit.era);
    const { organization } = gameDataManager.getGameRules();
    return organization.startedRoutingOrgRadiusDistance;
  }
}

// Auto-register when module is loaded
UnitEffectRegistry.register(StartedRouting);
