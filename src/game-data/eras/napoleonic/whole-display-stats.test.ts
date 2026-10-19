import unitTemplates from "./unit-templates.json";
import damageTypes from "./damage-types.json";

// Stored x100 so the game shows a whole number: 1700 reads 17, never 17.33.
const X100_STATS = [
  "meleeAttack",
  "meleeDefense",
  "rangedAttack",
  "chargeBonus",
  "hp",
  "org",
  "stamina",
  "ammo",
  "ammoCost",
];

const fractionalStats = (entries: object[]) =>
  entries.flatMap((entry) =>
    Object.entries(entry)
      .filter(([key, value]) => X100_STATS.includes(key) && typeof value === "number" && value % 100 !== 0)
      .map(([key, value]) => `${(entry as { name?: string }).name}.${key} = ${value}`),
  );

describe("Napoleonic stats stored x100", () => {
  it("show a whole number on every unit", () => {
    expect(fractionalStats(unitTemplates)).toEqual([]);
  });

  it("show a whole number on every damage type", () => {
    expect(fractionalStats(damageTypes)).toEqual([]);
  });
});
