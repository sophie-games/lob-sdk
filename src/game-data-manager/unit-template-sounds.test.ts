import { GameDataManager } from "./game-data-manager";

describe("unit template sounds", () => {
  const napoleonic = GameDataManager.get("napoleonic");

  it.each([1, 4, 7, 10, 14, 16, 17, 20, 21])(
    "configures infantry charge audio for unit type %s",
    (type) => {
      expect(
        napoleonic.getUnitTemplateManager().getTemplate(type).chargeSound,
      ).toBe("infantry-charge");
    },
  );

  it.each([2, 5, 8, 11, 13, 22])(
    "configures cavalry charge audio for unit type %s",
    (type) => {
      expect(
        napoleonic.getUnitTemplateManager().getTemplate(type).chargeSound,
      ).toBe("cavalry-charge");
    },
  );

  it("leaves non-charging Napoleonic unit templates without charge audio", () => {
    const configuredTypes = new Set([
      1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 20, 21, 22,
    ]);

    for (const template of napoleonic
      .getUnitTemplateManager()
      .getTemplates()) {
      if (!configuredTypes.has(template.type)) {
        expect(template.chargeSound).toBeUndefined();
      }
    }
  });

  it("leaves WW2 unit templates without charge audio", () => {
    for (const template of GameDataManager.get("ww2")
      .getUnitTemplateManager()
      .getTemplates()) {
      expect(template.chargeSound).toBeUndefined();
    }
  });
});
