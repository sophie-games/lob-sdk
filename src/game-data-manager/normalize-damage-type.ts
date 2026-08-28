import {
  DamageTypeTemplate,
  DamageTypeRange,
  TargetStatModifier,
} from "./types";

type UnknownRecord = Record<string, unknown>;

interface LegacyDamageTypeRange extends UnknownRecord {
  start: number;
  end: number;
  startMod: number;
  endMod: number;
}

interface LegacyTargetStatModifier extends UnknownRecord {
  start: number;
  end: number;
  modifier: number;
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const lowerBoundFraction = (absolute: number, maxRange: number): number => {
  const fraction = absolute / maxRange;
  return fraction * maxRange > absolute
    ? fraction - Number.EPSILON * Math.max(1, Math.abs(fraction))
    : fraction;
};

const upperBoundFraction = (absolute: number, maxRange: number): number => {
  const fraction = absolute / maxRange;
  return fraction * maxRange < absolute
    ? fraction + Number.EPSILON * Math.max(1, Math.abs(fraction))
    : fraction;
};

const isCurrentRange = (value: unknown): value is DamageTypeRange => {
  if (!isRecord(value)) return false;
  const damageModifier = value.damageModifier;
  return (
    isFiniteNumber(value.from) &&
    isFiniteNumber(value.to) &&
    isRecord(damageModifier) &&
    isFiniteNumber(damageModifier.near) &&
    isFiniteNumber(damageModifier.far)
  );
};

const isLegacyRange = (value: unknown): value is LegacyDamageTypeRange =>
  isRecord(value) &&
  isFiniteNumber(value.start) &&
  isFiniteNumber(value.end) &&
  isFiniteNumber(value.startMod) &&
  isFiniteNumber(value.endMod);

const isCurrentTargetStatModifier = (
  value: unknown,
): value is TargetStatModifier =>
  isRecord(value) &&
  isFiniteNumber(value.from) &&
  isFiniteNumber(value.to) &&
  isFiniteNumber(value.value);

const isCurrentOrgDamageModifier = (
  value: unknown,
): value is { near: number; far: number } =>
  isRecord(value) &&
  isFiniteNumber(value.near) &&
  isFiniteNumber(value.far);

const isLegacyTargetStatModifier = (
  value: unknown,
): value is LegacyTargetStatModifier =>
  isRecord(value) &&
  isFiniteNumber(value.start) &&
  isFiniteNumber(value.end) &&
  isFiniteNumber(value.modifier);

const normalizeTargetStatModifier = (
  value: unknown,
): TargetStatModifier | undefined => {
  if (value === undefined || isCurrentTargetStatModifier(value)) return value;
  if (!isLegacyTargetStatModifier(value)) return undefined;
  const { start, end, modifier, ...rest } = value;
  return { ...rest, from: start, to: end, value: modifier };
};

/**
 * Adapts ranged custom definitions saved before 1.7 to the current runtime
 * shape. Current definitions are returned by reference so normal loading has
 * no new allocations or behavioral changes.
 */
export const normalizeDamageType = (
  damageType: DamageTypeTemplate,
): DamageTypeTemplate => {
  if (damageType.ranged !== true || damageType.ranges.every(isCurrentRange)) {
    return damageType;
  }

  const legacyRanges = damageType.ranges as unknown[];
  if (!legacyRanges.every(isLegacyRange)) {
    return damageType;
  }

  const maxRange = legacyRanges[legacyRanges.length - 1]?.end;
  if (!isFiniteNumber(maxRange) || maxRange <= 0) {
    return damageType;
  }

  const rawDamageType = damageType as unknown as UnknownRecord;
  const ranges: DamageTypeRange[] = legacyRanges.map((range) => {
    const {
      start,
      end,
      startMod,
      endMod,
      from: _staleFrom,
      to: _staleTo,
      orgDamageRatio,
      orgModifierByTargetOrg,
      orgDamageModifier,
      orgDamageModifierByTargetOrg,
      ...rest
    } = range;
    const normalizedOrgDamageModifier =
      isCurrentOrgDamageModifier(orgDamageModifier)
        ? orgDamageModifier
        : isFiniteNumber(orgDamageRatio) &&
            isFiniteNumber(rawDamageType.orgDamageRatio) &&
            rawDamageType.orgDamageRatio !== 0
          ? {
              near: orgDamageRatio / rawDamageType.orgDamageRatio - 1,
              far: orgDamageRatio / rawDamageType.orgDamageRatio - 1,
            }
          : undefined;
    const normalizedOrgDamageModifierByTargetOrg =
      isCurrentTargetStatModifier(orgDamageModifierByTargetOrg)
        ? orgDamageModifierByTargetOrg
        : normalizeTargetStatModifier(orgModifierByTargetOrg);
    return {
      ...rest,
      // Dividing an absolute boundary into a fraction and multiplying it back
      // can round one ULP inward. Nudge only inward-rounded bounds outward so
      // the legacy inclusive, first-match band semantics survive conversion.
      from: lowerBoundFraction(start, maxRange),
      to: upperBoundFraction(end, maxRange),
      damageModifier: { near: startMod, far: endMod },
      ...(normalizedOrgDamageModifier === undefined
        ? {}
        : { orgDamageModifier: normalizedOrgDamageModifier }),
      ...(normalizedOrgDamageModifierByTargetOrg === undefined
        ? {}
        : {
            orgDamageModifierByTargetOrg:
              normalizedOrgDamageModifierByTargetOrg,
          }),
    };
  });

  const {
    orgModifierByTargetOrg,
    orgDamageModifierByTargetOrg,
    damageModifierByTargetHp,
    ...rest
  } = rawDamageType;

  return {
    ...rest,
    maxRange,
    ranges,
    ...(damageModifierByTargetHp === undefined
      ? {}
      : {
          damageModifierByTargetHp: normalizeTargetStatModifier(
            damageModifierByTargetHp,
          ),
        }),
    ...(orgDamageModifierByTargetOrg !== undefined
      ? { orgDamageModifierByTargetOrg }
      : orgModifierByTargetOrg === undefined
        ? {}
        : {
            orgDamageModifierByTargetOrg: normalizeTargetStatModifier(
              orgModifierByTargetOrg,
            ),
          }),
  } as unknown as DamageTypeTemplate;
};
