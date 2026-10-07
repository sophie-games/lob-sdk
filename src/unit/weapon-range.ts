import {
  EngagementRange,
  GameDataManager,
  RangedDamageTypeTemplate,
} from "@lob-sdk/game-data-manager";

/**
 * The farthest distance a single ranged weapon will autofire at the given engagement tier: the
 * farthest reach among its bands usable at that tier. A band is usable when its `engagementTier`
 * is at most `tier` (untagged bands count as `Max`). Returns null when no band is usable, i.e.
 * the weapon holds fire entirely at this tier. Band `to` is a fraction of `maxRange`.
 */
export const usableMaxRange = (
  weapon: RangedDamageTypeTemplate,
  tier: EngagementRange,
): number | null => {
  let max: number | null = null;
  for (const band of weapon.ranges) {
    if ((band.engagementTier ?? EngagementRange.Max) <= tier) {
      const end = band.to * weapon.maxRange;
      if (max === null || end > max) {
        max = end;
      }
    }
  }
  return max;
};

/**
 * The weapon whose reach gates the unit's autofire at this tier: the longest-reaching one still
 * firing. It sets both how far the unit engages and how range is measured (see `aimMode`).
 * Null when every weapon holds fire.
 */
export const bindingWeapon = (
  rangedDamageTypes: readonly string[],
  tier: EngagementRange,
  gameDataManager: GameDataManager,
): { weapon: RangedDamageTypeTemplate; reach: number } | null => {
  let binding: { weapon: RangedDamageTypeTemplate; reach: number } | null =
    null;
  for (const weapon of rangedWeapons(rangedDamageTypes, gameDataManager)) {
    const reach = usableMaxRange(weapon, tier);
    if (reach !== null && (binding === null || reach > binding.reach)) {
      binding = { weapon, reach };
    }
  }
  return binding;
};

/**
 * How close a unit closes on its target before it stops and fights: the nearest `preferredRange`
 * among the weapons it is actually firing at this tier, never further out than that weapon can
 * reach. Unpicked, a weapon with no preference (round shot, a shell) gives no reason to close
 * and has no say; a unit whose weapons all decline closes to contact.
 *
 * Being derived, it follows the player's engagement-range setting and cannot leave a unit
 * holding outside the range it is firing at. An `approachTier` the player picked instead stops
 * where that tier reaches for every weapon it fires, so each one closes in further than
 * the one above it.
 */
export const standoffDistance = ({
  rangedDamageTypes,
  tier,
  approachTier,
  legacyStandoff,
  gameDataManager,
}: {
  rangedDamageTypes: readonly string[];
  tier: EngagementRange;
  /** The approach tier the player picked, never past `tier`; unset closes to the preferred range. */
  approachTier?: EngagementRange;
  /** A template's deprecated absolute `minDistanceToFAA`; still wins, still clamped. */
  legacyStandoff?: number;
  gameDataManager: GameDataManager;
}): number => {
  if (legacyStandoff !== undefined) {
    const binding = bindingWeapon(rangedDamageTypes, approachTier ?? tier, gameDataManager);
    return binding === null
      ? legacyStandoff
      : Math.min(legacyStandoff, binding.reach);
  }

  let standoff: number | null = null;
  for (const weapon of rangedWeapons(rangedDamageTypes, gameDataManager)) {
    // A picked tier binds every weapon it fires; unpicked, only one that wants to close.
    if (approachTier === undefined && weapon.preferredRange === undefined) continue;
    const reach = usableMaxRange(weapon, approachTier ?? tier);
    if (reach === null) continue;

    const preferred = approachTier === undefined
      ? Math.min(weapon.preferredRange! * weapon.maxRange, reach)
      : reach;
    if (standoff === null || preferred < standoff) {
      standoff = preferred;
    }
  }
  return standoff ?? 0;
};

function* rangedWeapons(
  rangedDamageTypes: readonly string[],
  gameDataManager: GameDataManager,
): Generator<RangedDamageTypeTemplate> {
  for (const name of rangedDamageTypes) {
    const weapon =
      gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name);
    if (weapon.ranged) yield weapon;
  }
}
