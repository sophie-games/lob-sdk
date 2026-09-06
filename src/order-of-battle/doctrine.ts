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
 * Battalions a division is aimed at. A French division of 1809 was two brigades
 * of two regiments, and a regiment usually two war battalions, so eight was
 * typical and the large ones reached twelve.
 */
export const UNITS_PER_DIVISION = 10;

/**
 * Regiments a cavalry division is aimed at. The reserve cavalry was a corps of
 * divisions, each two brigades of two regiments, not one mass of horse.
 */
export const UNITS_PER_CAVALRY_DIVISION = 6;

/** A division is two brigades, the way a Napoleonic one was. */
export const BRIGADES_PER_DIVISION = 2;

/**
 * Units a brigade needs before a second one is raised. A brigade was two
 * regiments, so a body too small to give each of them that stays undivided
 * rather than becoming brigades of one.
 */
export const UNITS_PER_BRIGADE = 2;

/**
 * Batteries a division carries as its own artillery. Napoleon wanted two per
 * division; the corps reserve held only the heavy pieces, which is what the
 * leftovers become.
 */
export const DIVISION_BATTERIES = 2;

/** Divisions an army can hold, one per control-group key. */
export const MAX_DIVISIONS = 10;

/**
 * Divisions a body of the given strength wants. Rounded, not rounded up: a body
 * a little over the target is one full division rather than two under-strength
 * ones.
 */
export function divisionsWanted(strength: number, per: number): number {
  return strength === 0 ? 0 : Math.max(1, Math.round(strength / per));
}

/** Brigades each of `divisions` gets, given the strength there is to fill them. */
export function brigadesPerDivision(
  strength: number,
  divisions: number,
): number {
  if (divisions <= 0) return 0;
  return Math.max(
    1,
    Math.min(
      BRIGADES_PER_DIVISION,
      Math.floor(strength / (divisions * UNITS_PER_BRIGADE)),
    ),
  );
}

/**
 * Share `budget` out between the arms, giving each what it wants when they fit
 * and otherwise squeezing them all by the same factor, so neither arm is left as
 * one mass while the other is finely divided. An arm with troops keeps a
 * division of its own.
 */
export function shareDivisions(wanted: number[], budget: number): number[] {
  const total = wanted.reduce((sum, n) => sum + n, 0);
  if (total <= budget) return wanted;

  const shares = wanted.map((want) =>
    want === 0 ? 0 : Math.max(1, Math.floor((want / total) * budget)),
  );
  // Rounding down can leave a slot free; give it to whichever arm wants most.
  let spare = budget - shares.reduce((sum, n) => sum + n, 0);
  while (spare > 0) {
    const at = shares.indexOf(Math.max(...shares));
    shares[at] += 1;
    spare -= 1;
  }
  return shares.map((share, i) => Math.min(share, wanted[i]));
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
