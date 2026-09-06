import { UnitCategoryId } from "@lob-sdk/types";

/**
 * The shape a Napoleonic army was organised into, as numbers. Both the deployer,
 * which lays an army out in its zone, and the client, which reads an order of
 * battle back off the field, work from these, so the blocks a player is given at
 * deployment are the divisions the panel then shows them.
 *
 * The figures are sourced in docs/gameplay/napoleonic-order-of-battle.md.
 */

/**
 * The most units a division may hold, guns included. A hard ceiling, not a
 * target: a French division of 1809 was two brigades of two regiments of two war
 * battalions, so eight was typical and the large ones reached twelve. An army
 * with more foot than that simply raises more divisions.
 */
export const MAX_UNITS_PER_DIVISION = 12;

/**
 * The most units a cavalry division may hold, its horse battery included. A
 * cavalry division was two brigades of two or three regiments, so four to six.
 */
export const MAX_UNITS_PER_CAVALRY_DIVISION = 6;

/** A division is two brigades, the way a Napoleonic one was. */
export const BRIGADES_PER_DIVISION = 2;

/**
 * Batteries a division carries as its own artillery. Napoleon wanted two per
 * division; the corps reserve held only the heavy pieces, which is what the
 * leftovers become. A cavalry division took one horse battery.
 */
export const DIVISION_BATTERIES = 2;
export const CAVALRY_DIVISION_BATTERIES = 1;

/** Battalions a division holds once its own guns have taken their places. */
export const MAX_TROOPS_PER_DIVISION =
  MAX_UNITS_PER_DIVISION - DIVISION_BATTERIES;
export const MAX_TROOPS_PER_CAVALRY_DIVISION =
  MAX_UNITS_PER_CAVALRY_DIVISION - CAVALRY_DIVISION_BATTERIES;

/** The most a brigade may hold: its share of a full division's troops. */
export const MAX_UNITS_PER_BRIGADE = Math.ceil(
  MAX_TROOPS_PER_DIVISION / BRIGADES_PER_DIVISION,
);
export const MAX_UNITS_PER_CAVALRY_BRIGADE = Math.ceil(
  MAX_TROOPS_PER_CAVALRY_DIVISION / BRIGADES_PER_DIVISION,
);

/** Control-group keys, so the divisions past the tenth carry no digit. */
export const KEYED_DIVISIONS = 10;

/**
 * Divisions a body of the given strength needs to stay under the ceiling. It is
 * the ceiling that is fixed, so a bigger army is more divisions rather than
 * bigger ones.
 */
export function divisionsNeeded(strength: number, max: number): number {
  return strength === 0 ? 0 : Math.ceil(strength / max);
}

/** Brigades a division of `strength` units needs to stay under the ceiling. */
export function brigadesNeeded(strength: number, max: number): number {
  return Math.max(1, Math.min(BRIGADES_PER_DIVISION, Math.ceil(strength / max)));
}

/**
 * Cut `items` into `count` groups of roughly equal weight, in order. `weigh`
 * reports what an item counts for, so a named regiment can be cut as one body.
 */
export function cutIntoGroups<T>(
  items: T[],
  count: number,
  weigh: (item: T) => number,
): T[][] {
  if (count <= 1) return items.length === 0 ? [] : [items];

  const total = items.reduce((sum, item) => sum + weigh(item), 0);
  const groups: T[][] = Array.from({ length: count }, () => []);
  let taken = 0;

  for (const item of items) {
    // The group this item belongs to, by how far along the body it sits.
    const group = Math.min(count - 1, Math.floor((taken * count) / total));
    groups[group].push(item);
    taken += weigh(item);
  }

  return groups.filter((group) => group.length > 0);
}

/** What a unit fights as, which decides the formation it is organised into. */
export enum Arm {
  Foot,
  Horse,
  Guns,
}

/**
 * Arm each unit category belongs to. A category that is not listed is treated as
 * foot, which is the harmless default: it joins the line brigades.
 */
const ARM_BY_CATEGORY: Record<string, Partial<Record<UnitCategoryId, Arm>>> = {
  napoleonic: {
    infantry: Arm.Foot,
    guardsInfantry: Arm.Foot,
    militiaInfantry: Arm.Foot,
    skirmishInfantry: Arm.Foot,
    lightCavalry: Arm.Horse,
    midCavalry: Arm.Horse,
    heavyCavalry: Arm.Horse,
    scoutCavalry: Arm.Horse,
    artillery: Arm.Guns,
  },
  ww2: {
    infantry: Arm.Foot,
    motorized: Arm.Foot,
    armored: Arm.Horse,
  },
};

export function armOf(era: string, category: UnitCategoryId): Arm {
  return ARM_BY_CATEGORY[era]?.[category] ?? Arm.Foot;
}

/**
 * The light infantry a division was given a share of rather than whatever stood
 * in its stretch of the line: a French division carried one legere regiment among
 * its line ones, so the skirmishers are dealt out evenly instead of clumping.
 */
export const LIGHT_INFANTRY = "skirmishInfantry";

/** The three kinds of cavalry division the period raised, and never mixed. */
export enum HorseClass {
  Light,
  Dragoon,
  Cuirassier,
}

/** Anything unlisted counts as light, which is the harmless catch-all. */
const HORSE_CLASS: Partial<Record<UnitCategoryId, HorseClass>> = {
  scoutCavalry: HorseClass.Light,
  lightCavalry: HorseClass.Light,
  midCavalry: HorseClass.Dragoon,
  heavyCavalry: HorseClass.Cuirassier,
};

export function horseClassOf(category: UnitCategoryId): HorseClass {
  return HORSE_CLASS[category] ?? HorseClass.Light;
}
