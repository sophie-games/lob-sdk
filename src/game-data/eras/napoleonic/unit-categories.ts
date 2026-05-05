// Canonical Napoleonic unit-category lists. Single source of truth shared by
// the tutorial situation predicates AND by tooling/tests that validate the
// scenario JSON. If you add or rename a unit category, update this file —
// the JSON consistency test in
// `client/src/game/tutorial/runner/scenario-categories.test.ts` will fail
// otherwise.

export const NAPOLEONIC_INFANTRY_CATEGORIES = [
  "infantry",
  "guardsInfantry",
  "militiaInfantry",
] as const;

export const NAPOLEONIC_CAVALRY_CATEGORIES = [
  "midCavalry",
  "lightCavalry",
  "heavyCavalry",
  "scoutCavalry",
] as const;

export const NAPOLEONIC_ARTILLERY_CATEGORIES = ["artillery"] as const;

export const NAPOLEONIC_SKIRMISHER_CATEGORIES = ["skirmishInfantry"] as const;
