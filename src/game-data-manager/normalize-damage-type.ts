import {
  AuthoredDamageType,
  AuthoredDamageTypeRange,
  AuthoredRangedDamageType,
  DamageTypeRange,
  DamageTypeTemplate,
  OrgModifierByTargetOrg,
  RangedDamageTypeTemplate,
  TargetStatModifier,
} from "./types";

/**
 * Converts an authoring-format target-stat modifier (`{ from, to, by }`) to the runtime
 * `{ start, end, modifier }` shape shared by `orgModifierByTargetOrg` and
 * `damageModifierByTargetHp`.
 */
const toStartEndModifier = (m: TargetStatModifier): OrgModifierByTargetOrg => ({
  start: m.from,
  end: m.to,
  modifier: m.by,
});

/**
 * Kills float-division noise (`108 / 348 * 348 = 108.00000000000001`) so integer authoring
 * distances round-trip to the exact value the engine's band boundaries expect.
 */
const roundDistance = (x: number): number => Math.round(x * 1e6) / 1e6;

/**
 * Converts one authoring range band to a runtime band: `from`/`to` fractions become
 * absolute distances against `maxRange`, and the `damageModifier`/`orgDamageModifier`
 * near/far values become `startMod`/`endMod` and `orgStartMod`/`orgEndMod`.
 */
const normalizeBand = (
  band: AuthoredDamageTypeRange,
  maxRange: number,
): DamageTypeRange => {
  const range: DamageTypeRange = {
    start: roundDistance(band.from * maxRange),
    end: roundDistance(band.to * maxRange),
    startMod: band.damageModifier.near,
    endMod: band.damageModifier.far,
  };
  if (band.name !== undefined) {
    range.name = band.name;
  }
  if (band.engagementTier !== undefined) {
    range.engagementTier = band.engagementTier;
  }
  if (band.orgDamageModifier) {
    range.orgStartMod = band.orgDamageModifier.near;
    range.orgEndMod = band.orgDamageModifier.far;
  }
  if (band.orgModifierByTargetOrg) {
    range.orgModifierByTargetOrg = toStartEndModifier(
      band.orgModifierByTargetOrg,
    );
  }
  return range;
};

/**
 * Normalizes an authoring-format ranged damage type to the runtime shape the engine
 * consumes: range-band distances resolve against `maxRange`, and the target-stat
 * modifiers move from `{ from, to, by }` to `{ start, end, modifier }`.
 */
export const normalizeRangedDamageType = (
  dt: AuthoredRangedDamageType,
): RangedDamageTypeTemplate => {
  const {
    ranges,
    maxRange,
    damageModifierByTargetHp,
    orgDamageModifierByTargetOrg,
    ...rest
  } = dt;
  const normalized: RangedDamageTypeTemplate = {
    ...rest,
    maxRange,
    ranges: ranges.map((band) => normalizeBand(band, maxRange)),
  };
  if (damageModifierByTargetHp) {
    normalized.damageModifierByTargetHp = toStartEndModifier(
      damageModifierByTargetHp,
    );
  }
  if (orgDamageModifierByTargetOrg) {
    normalized.orgModifierByTargetOrg = toStartEndModifier(
      orgDamageModifierByTargetOrg,
    );
  }
  return normalized;
};

/**
 * Normalizes an authored damage type to the runtime shape. Melee types carry no range
 * bands and pass through unchanged.
 */
export const normalizeDamageType = (
  dt: AuthoredDamageType,
): DamageTypeTemplate =>
  dt.ranged ? normalizeRangedDamageType(dt) : dt;
