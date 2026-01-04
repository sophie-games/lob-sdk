import { UnitEffectDto } from "@lob-sdk/types";
import { BaseUnit } from "@lob-sdk/unit";
import { BaseUnitEffect } from "./base-unit-effect";
import { UnitEffectRegistry } from "./unit-effect-registry";
import { UnitEffectDisplayStat } from "./types";
import { GameDataManager } from "@lob-sdk/game-data-manager";

/**
 * Effect applied when a unit has taken fire from enemies.
 * Affects charge resistance and other combat behaviors.
 */
export class TakenFire extends BaseUnitEffect {
  static readonly id = 5;
  static readonly name = "taken_fire";

  reorgDebuff: number;

  constructor(duration: number, reorgDebuff: number) {
    super(duration);
    this.reorgDebuff = reorgDebuff;
  }

  onAdded(unit: BaseUnit): void {
    unit.reorgDebuff = Math.max(unit.reorgDebuff, this.reorgDebuff);
  }

  onTickStart(unit: BaseUnit): void {
    unit.reorgDebuff = Math.max(unit.reorgDebuff, this.reorgDebuff);
  }

  merge(other: TakenFire): void {
    // Prioritize effects with more reorg debuff
    if (other.reorgDebuff >= this.reorgDebuff) {
      this.duration = other.duration;
      this.reorgDebuff = other.reorgDebuff;
    }
  }

  toDto(): UnitEffectDto {
    return [this.id, this.duration, this.reorgDebuff];
  }

  getDisplayStats(unit: BaseUnit): UnitEffectDisplayStat[] {
    const gameDataManager = GameDataManager.get(unit.era);
    const { HAS_TAKEN_FIRE_SPEED_MODIFIER } =
      gameDataManager.getGameConstants();

    return [
      {
        label: "movement",
        type: "percentage",
        value: HAS_TAKEN_FIRE_SPEED_MODIFIER,
        color: HAS_TAKEN_FIRE_SPEED_MODIFIER < 0 ? "red" : "green",
      },
      {
        label: "reorgDebuff",
        type: "percentage",
        signed: true,
        value: this.reorgDebuff,
        color: this.reorgDebuff > 0 ? "red" : "green",
      },
    ];
  }
}

// Auto-register when module is loaded
UnitEffectRegistry.register(TakenFire);
