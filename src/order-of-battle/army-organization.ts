import type {
  ArmyOrganization,
  EntityId,
  UnitCounts,
  UnitType,
} from "@lob-sdk/types";
import type { OrganizationDoctrine, ScenarioOrganization } from "./types";

const MAX_DIVISIONS = 100;
const MAX_BRIGADES_PER_DIVISION = 20;
const MAX_NAME_LENGTH = 32;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const add = (counts: UnitCounts, type: UnitType, amount: number) => {
  counts[type] = (counts[type] ?? 0) + amount;
};

const compactCounts = (counts: UnitCounts): UnitCounts =>
  Object.fromEntries(
    Object.entries(counts)
      .filter(([, count]) => count > 0)
      .sort(([left], [right]) => Number(left) - Number(right)),
  ) as UnitCounts;

export function countArmyOrganizationUnits(
  organization: ArmyOrganization,
): UnitCounts {
  const counts: UnitCounts = {};
  for (const division of organization.divisions) {
    for (const brigade of division.brigades) {
      for (const [type, count] of Object.entries(brigade.units)) {
        add(counts, Number(type), count);
      }
    }
  }
  return compactCounts(counts);
}

/** Validate the persisted JSON shape and require it to cover the deployed roster exactly. */
export function validateArmyOrganization(
  value: unknown,
  doctrine: OrganizationDoctrine,
  expectedUnits: UnitCounts,
): string[] {
  const errors: string[] = [];
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.divisions) ||
    value.divisions.length > MAX_DIVISIONS
  ) {
    return ["Invalid army organization"];
  }

  const divisionKinds = new Set(doctrine.divisions.map(({ id }) => id));
  const brigadeKinds = new Set(Object.keys(doctrine.brigades));
  let hasEmptyBody = false;
  let invalidCount = false;
  const totals: UnitCounts = {};

  for (const division of value.divisions) {
    if (!isRecord(division) || !Array.isArray(division.brigades)) {
      errors.push("Invalid army organization division");
      continue;
    }
    if (
      typeof division.kind !== "string" ||
      !divisionKinds.has(division.kind)
    ) {
      errors.push(`Unknown division kind ${String(division.kind)}`);
    }
    if (
      division.name !== undefined &&
      (typeof division.name !== "string" ||
        division.name.length > MAX_NAME_LENGTH)
    ) {
      errors.push("Organization names must be at most 32 characters");
    }
    if (
      division.brigades.length === 0 ||
      division.brigades.length > MAX_BRIGADES_PER_DIVISION
    ) {
      hasEmptyBody = division.brigades.length === 0 || hasEmptyBody;
      if (division.brigades.length > MAX_BRIGADES_PER_DIVISION) {
        errors.push("Too many brigades in one division");
      }
    }

    for (const brigade of division.brigades) {
      if (!isRecord(brigade) || !isRecord(brigade.units)) {
        errors.push("Invalid army organization brigade");
        continue;
      }
      if (typeof brigade.kind !== "string" || !brigadeKinds.has(brigade.kind)) {
        errors.push(`Unknown brigade kind ${String(brigade.kind)}`);
      }
      if (
        brigade.name !== undefined &&
        (typeof brigade.name !== "string" ||
          brigade.name.length > MAX_NAME_LENGTH)
      ) {
        errors.push("Organization names must be at most 32 characters");
      }
      const entries = Object.entries(brigade.units);
      if (entries.length === 0) hasEmptyBody = true;
      for (const [rawType, rawCount] of entries) {
        const type = Number(rawType);
        if (
          String(type) !== rawType ||
          typeof rawCount !== "number" ||
          !Number.isSafeInteger(rawCount) ||
          rawCount <= 0
        ) {
          invalidCount = true;
          continue;
        }
        add(totals, type, rawCount);
      }
    }
  }

  if (hasEmptyBody) errors.push("Divisions and brigades cannot be empty");
  if (invalidCount)
    errors.push("Organization unit counts must be positive integers");

  const actual = compactCounts(totals);
  const expected = compactCounts(expectedUnits);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    errors.push("Organization units must exactly match the deployed army");
  }
  return [...new Set(errors)];
}

/** Replace compact counts with this match's real IDs, preserving deterministic unit order. */
export function materializeArmyOrganization(
  organization: ArmyOrganization,
  player: number,
  units: readonly { id: EntityId; type: UnitType }[],
): ScenarioOrganization | null {
  const byType = new Map<UnitType, EntityId[]>();
  for (const unit of units) {
    const bucket = byType.get(unit.type) ?? [];
    bucket.push(unit.id);
    byType.set(unit.type, bucket);
  }
  const taken = new Map<UnitType, number>();
  const divisions: ScenarioOrganization["divisions"] = [];

  for (const division of organization.divisions) {
    const brigades: ScenarioOrganization["divisions"][number]["brigades"] = [];
    for (const brigade of division.brigades) {
      const unitIds: EntityId[] = [];
      for (const [rawType, count] of Object.entries(brigade.units)) {
        const type = Number(rawType);
        const start = taken.get(type) ?? 0;
        const selected = (byType.get(type) ?? []).slice(start, start + count);
        if (selected.length !== count) return null;
        unitIds.push(...selected);
        taken.set(type, start + count);
      }
      brigades.push({
        kind: brigade.kind,
        ...(brigade.name ? { name: brigade.name } : {}),
        unitIds,
      });
    }
    divisions.push({
      kind: division.kind,
      ...(division.name ? { name: division.name } : {}),
      brigades,
    });
  }

  for (const [type, bucket] of byType) {
    if ((taken.get(type) ?? 0) !== bucket.length) return null;
  }
  return { player, divisions };
}
