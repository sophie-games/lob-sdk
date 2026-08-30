import { GameDataManager } from "./game-data-manager";

describe("unit category sounds", () => {
  const napoleonic = GameDataManager.get("napoleonic");

  it.each([
    "infantry",
    "guardsInfantry",
    "militiaInfantry",
    "skirmishInfantry",
  ] as const)("configures infantry charge audio for %s", (category) => {
    expect(napoleonic.getUnitCategoryTemplate(category).chargeSound).toBe(
      "infantry-charge",
    );
  });

  it.each([
    "midCavalry",
    "scoutCavalry",
    "lightCavalry",
    "heavyCavalry",
  ] as const)("configures cavalry charge audio for %s", (category) => {
    expect(napoleonic.getUnitCategoryTemplate(category).chargeSound).toBe(
      "cavalry-charge",
    );
  });

  it.each(["artillery", "ship"] as const)(
    "does not configure charge audio for Napoleonic %s",
    (category) => {
      expect(
        napoleonic.getUnitCategoryTemplate(category).chargeSound,
      ).toBeUndefined();
    },
  );

  it.each(["infantry", "motorized", "armored"] as const)(
    "does not configure charge audio for WW2 %s",
    (category) => {
      expect(
        GameDataManager.get("ww2").getUnitCategoryTemplate(category).chargeSound,
      ).toBeUndefined();
    },
  );
});
