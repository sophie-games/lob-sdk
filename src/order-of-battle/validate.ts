import type { Scenario } from "@lob-sdk/types";
import type { OrganizationDoctrine } from "./types";

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every((v) => typeof v === "string" && v.length > 0);
const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

/** Validate imported organization data before deployment or client initialization. */
export function validateOrganization(
  scenario: Scenario,
  defaults: OrganizationDoctrine,
  categories: Set<string>,
): string[] {
  const errors: string[] = [];
  const doctrine: unknown =
    scenario.organizationDoctrine === undefined
      ? defaults
      : scenario.organizationDoctrine;
  if (
    !record(doctrine) ||
    !Array.isArray(doctrine.divisions) ||
    !doctrine.divisions.length ||
    !record(doctrine.brigades)
  )
    return ["organizationDoctrine must define divisions and brigades"];
  const kinds = new Set<string>();
  const assignedCategories = new Set<string>();
  const labels: unknown[] = Object.values(doctrine.brigades);
  for (const d of doctrine.divisions) {
    if (!record(d) || typeof d.id !== "string" || !d.id.length) {
      errors.push("Each division type needs an id");
      continue;
    }
    labels.push(d);
    if (kinds.has(d.id)) errors.push(`Duplicate division type ${d.id}`);
    kinds.add(d.id);
    if (
      typeof d.brigadeKind !== "string" ||
      !Object.hasOwn(doctrine.brigades, d.brigadeKind)
    )
      errors.push(`Unknown brigade kind in ${d.id}`);
    for (const key of ["maxTroops", "maxPerBrigade", "maxBrigades"])
      if (!positive(d[key]) || d[key] > 1000)
        errors.push(`${d.id}.${key} must be an integer from 1 to 1000`);
    if (
      !["front", "rear"].includes(String(d.row)) ||
      !["centre", "flanks"].includes(String(d.position))
    )
      errors.push(`Invalid deployment position in ${d.id}`);
    if (!strings(d.categories)) errors.push(`Invalid categories in ${d.id}`);
    else
      for (const category of d.categories) {
        if (!categories.has(category))
          errors.push(`Unknown category ${category}`);
        if (assignedCategories.has(category))
          errors.push(
            `Category ${category} assigned to multiple division types`,
          );
        assignedCategories.add(category);
      }
    if (
      d.distributedCategories !== undefined &&
      (!strings(d.distributedCategories) ||
        d.distributedCategories.some(
          (c) => !Array.isArray(d.categories) || !d.categories.includes(c),
        ))
    )
      errors.push(`Invalid distributedCategories in ${d.id}`);
    if (d.classes !== undefined) {
      if (!Array.isArray(d.classes) || !d.classes.length)
        errors.push(`Invalid classes in ${d.id}`);
      else {
        const seen = new Set<string>();
        for (const c of d.classes) {
          if (
            !record(c) ||
            !strings(c.categories) ||
            !["front", "rear"].includes(String(c.row)) ||
            !["centre", "flanks"].includes(String(c.position))
          ) {
            errors.push(`Invalid class in ${d.id}`);
            continue;
          }
          for (const category of c.categories) {
            if (
              seen.has(category) ||
              !Array.isArray(d.categories) ||
              !d.categories.includes(category)
            )
              errors.push(`Invalid class category ${category} in ${d.id}`);
            seen.add(category);
          }
        }
      }
    }
  }
  for (const label of labels) {
    if (
      !record(label) ||
      (label.name !== undefined && typeof label.name !== "string") ||
      (label.titleKey !== undefined && typeof label.titleKey !== "string")
    )
      errors.push("Organization labels must contain text");
  }
  if (
    typeof doctrine.defaultDivisionKind !== "string" ||
    !kinds.has(doctrine.defaultDivisionKind)
  )
    errors.push("Unknown defaultDivisionKind");
  if (
    typeof doctrine.defaultBrigadeKind !== "string" ||
    !Object.hasOwn(doctrine.brigades, doctrine.defaultBrigadeKind)
  )
    errors.push("Unknown defaultBrigadeKind");
  const supportKinds = new Set<string>();
  for (const d of doctrine.divisions) {
    if (!record(d) || d.support === undefined) continue;
    if (!Array.isArray(d.support)) {
      errors.push(`Invalid support in ${d.id}`);
      continue;
    }
    const seen = new Set<string>();
    for (const rule of d.support) {
      if (
        !record(rule) ||
        typeof rule.kind !== "string" ||
        !kinds.has(rule.kind) ||
        !positive(rule.maxBlocks) ||
        rule.maxBlocks > 1000 ||
        (rule.fasterThan !== undefined &&
          (typeof rule.fasterThan !== "string" || !kinds.has(rule.fasterThan)))
      ) {
        errors.push(`Invalid support rule in ${d.id}`);
        continue;
      }
      if (seen.has(rule.kind)) errors.push(`Duplicate support rule in ${d.id}`);
      seen.add(rule.kind);
      supportKinds.add(rule.kind);
    }
  }
  for (const d of doctrine.divisions)
    if (
      record(d) &&
      supportKinds.has(String(d.id)) &&
      Array.isArray(d.support) &&
      d.support.length
    )
      errors.push("Support types cannot themselves receive support");

  if (scenario.organizations === undefined) return errors;
  if (!Array.isArray(scenario.organizations))
    return [...errors, "organizations must be an array"];
  const units = new Map(
    (Array.isArray(scenario.units) ? scenario.units : [])
      .filter((u) => record(u) && u.id !== undefined)
      .map((u) => [u.id, u]),
  );
  const explicitUnits = (
    Array.isArray(scenario.units) ? scenario.units : []
  ).filter((u) => record(u) && u.id !== undefined);
  if (units.size !== explicitUnits.length)
    errors.push("Scenario unit IDs must be unique for organization membership");
  const claimed = new Set<number>();
  const players = new Set<number>();
  for (const organization of scenario.organizations) {
    if (
      !record(organization) ||
      !positive(organization.player) ||
      !Array.isArray(organization.divisions)
    ) {
      errors.push("Each organization needs a player and divisions");
      continue;
    }
    if (players.has(organization.player))
      errors.push(`Duplicate organization for player ${organization.player}`);
    players.add(organization.player);
    if (
      Array.isArray(scenario.players) &&
      !scenario.players.some((p) => p?.player === organization.player)
    )
      errors.push(`Unknown organization player ${organization.player}`);
    for (const d of organization.divisions) {
      if (
        !record(d) ||
        !Array.isArray(d.brigades) ||
        (d.kind !== undefined &&
          (typeof d.kind !== "string" || !kinds.has(d.kind))) ||
        (d.name !== undefined && typeof d.name !== "string")
      ) {
        errors.push("Invalid scenario division");
        continue;
      }
      for (const b of d.brigades) {
        if (
          !record(b) ||
          !Array.isArray(b.unitIds) ||
          (b.kind !== undefined &&
            (typeof b.kind !== "string" ||
              !Object.hasOwn(doctrine.brigades, b.kind))) ||
          (b.name !== undefined && typeof b.name !== "string")
        ) {
          errors.push("Invalid scenario brigade");
          continue;
        }
        for (const id of b.unitIds) {
          if (!positive(id) || !units.has(id)) {
            errors.push(
              `Organization references missing explicit unit id ${id}`,
            );
            continue;
          }
          if (units.get(id)!.player !== organization.player)
            errors.push(`Unit ${id} belongs to another player`);
          if (claimed.has(id))
            errors.push(`Unit ${id} belongs to more than one brigade`);
          claimed.add(id);
        }
      }
    }
  }
  return errors;
}
