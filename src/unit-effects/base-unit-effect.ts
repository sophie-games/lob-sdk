import { UnitEffectDto } from "@lob-sdk/types";
import { UnitEffectDisplayStat } from "./types";
import { RangedDamageTypeTemplate } from "@lob-sdk/game-data-manager";
import { BaseUnit } from "@lob-sdk/unit/base-unit";

/**
 * Base class for all unit effects.
 * Provides common functionality and structure for unit effects.
 */
export abstract class BaseUnitEffect {
  /**
   * The numeric ID representing this effect.
   */
  static readonly id: number;

  /**
   * The string name for this effect, used for referencing in templates.
   * Should be a snake_case identifier (e.g., "has_fired", "been_in_melee").
   */
  static readonly name: string;

  /**
   * Gets the unique identifier for this effect type.
   * @returns The effect ID from the static id property.
   */
  get id() {
    return (this.constructor as typeof BaseUnitEffect).id;
  }

  /**
   * Gets the string name for this effect type.
   * @returns The effect name from the static name property.
   */
  get name() {
    return (this.constructor as typeof BaseUnitEffect).name;
  }

  /**
   * Creates a new unit effect instance.
   * @param duration - The number of ticks this effect will last.
   */
  constructor(public duration: number) {}

  /**
   * Hook that is called when this effect is added to a unit.
   * Override this method to perform initialization logic when the effect is first applied.
   * @param unit - The unit this effect is being added to.
   */
  onAdded(unit: BaseUnit) {}

  /**
   * Hook that is called at the start of each game tick.
   * Override this method to perform logic that should happen at the beginning of a tick.
   * @param unit - The unit this effect is applied to.
   */
  onTickStart(unit: BaseUnit) {}

  /**
   * Hook that is called at the end of each game tick.
   * Decrements the duration and removes the effect if duration reaches zero or below.
   * Override this method to perform logic that should happen at the end of a tick.
   * @param unit - The unit this effect is applied to.
   */
  onTickEnd(unit: BaseUnit) {
    this.duration--;
    if (this.duration <= 0) {
      unit.deleteEffect(this.id);
    }
  }

  /**
   * Merges another effect of the same type into this effect.
   * Takes the maximum duration between the two effects.
   * @param other - The other effect to merge with this one.
   */
  merge(other: BaseUnitEffect): void {
    this.duration = Math.max(this.duration, other.duration);
  }

  /**
   * Converts this effect to a Data Transfer Object (DTO) format.
   * @returns A tuple containing the effect ID and duration.
   */
  toDto(): UnitEffectDto {
    return [this.id, this.duration];
  }

  /**
   * Returns the display stats for this effect.
   */
  getDisplayStats(unit: BaseUnit): UnitEffectDisplayStat[] {
    return [];
  }

  /**
   * Checks if a specific ranged damage type is blocked by this effect.
   * This method is called for each ranged damage type available to the unit during damage type selection.
   * Override this method to specify which ranged damage types cannot be used while this effect is active.
   *
   * @param unit - The unit this effect is applied to
   * @param template - The ranged damage type template to check (already loaded, no need to fetch)
   * @returns true if this ranged damage type should be blocked, false otherwise
   */
  isRangedDamageTypeBlocked(
    unit: BaseUnit,
    template: RangedDamageTypeTemplate
  ): boolean {
    return false;
  }
}
