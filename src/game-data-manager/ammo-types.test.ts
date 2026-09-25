import { GameDataManager } from "./game-data-manager";
import { RangedDamageTypeTemplate } from "./types";
import { RangeUnitTemplate, UnitTemplate } from "@lob-sdk/types";

describe("ammo types", () => {
  const gdm = GameDataManager.get("napoleonic");

  it("ships round shot as the napoleonic default ammo type", () => {
    expect(gdm.getDefaultAmmoType().name).toBe("round-shot");
  });

  it("looks ammo types up by name and by id", () => {
    const canister = gdm.getAmmoTypeByName("canister");
    expect(gdm.getAmmoTypeById(canister.id)).toBe(canister);
  });

  it("throws on an unknown ammo type name", () => {
    expect(() => gdm.getAmmoTypeByName("grapeshot-typo")).toThrow();
  });

  it("resolves a damage type's ammo type, falling back to the default", () => {
    const canister = gdm.getDamageTypeByName<RangedDamageTypeTemplate>(
      "12lb-canister-fire",
    );
    expect(gdm.getAmmoTypeOf(canister).name).toBe("canister");

    const legacy: RangedDamageTypeTemplate = { ...canister, ammoType: undefined };
    expect(gdm.getAmmoTypeOf(legacy).name).toBe("round-shot");
  });

  describe("getAmmoCapacity", () => {
    const base = gdm.getUnitTemplateManager().getTemplate(1);

    it("is null for a unit without an ammo system", () => {
      expect(gdm.getAmmoCapacity(base)).toBeNull();
    });

    it("reads a legacy single number as the default ammo type", () => {
      const legacy: UnitTemplate = { ...base, ammo: 20000 };
      expect(gdm.getAmmoCapacity(legacy)).toEqual({ "round-shot": 20000 });
    });

    it("gives a legacy single number to every ammo type the unit's weapons spend", () => {
      const battery = gdm
        .getUnitTemplateManager()
        .getTemplates()
        .find((t) => t.name === "12lb_artillery")!;
      const legacy: UnitTemplate = { ...battery, ammo: 20000 };
      expect(gdm.getAmmoCapacity(legacy)).toEqual({
        canister: 20000,
        "round-shot": 20000,
      });
    });

    it("passes a per-type map through", () => {
      const pools = { "round-shot": 20000, canister: 10000 };
      const template: UnitTemplate = { ...base, ammo: pools };
      expect(gdm.getAmmoCapacity(template)).toEqual(pools);
    });
  });

  it("gives every ammo-using napoleonic unit a pool for each ammo type its weapons spend", () => {
    const missing: string[] = [];
    for (const template of gdm.getUnitTemplateManager().getTemplates()) {
      const capacity = gdm.getAmmoCapacity(template);
      if (!capacity) continue;

      for (const name of (template as RangeUnitTemplate).rangedDamageTypes) {
        const damageType = gdm.getDamageTypeByName<RangedDamageTypeTemplate>(name);
        const ammoType = gdm.getAmmoTypeOf(damageType).name;
        if (damageType.ammoCost && !(capacity[ammoType] > 0)) {
          missing.push(`${template.name}: ${ammoType}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("splits canister and round shot into separate pools on a foot battery", () => {
    const battery = gdm
      .getUnitTemplateManager()
      .getTemplates()
      .find((t) => t.name === "12lb_artillery")!;
    const capacity = gdm.getAmmoCapacity(battery)!;
    expect(Object.keys(capacity).sort()).toEqual(["canister", "round-shot"]);
  });
});
