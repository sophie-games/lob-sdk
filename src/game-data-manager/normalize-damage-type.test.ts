import {
  AuthoredRangedDamageType,
  MeleeDamageTypeTemplate,
} from "./types";
import {
  normalizeDamageType,
  normalizeRangedDamageType,
} from "./normalize-damage-type";

describe("normalizeRangedDamageType", () => {
  const authored: AuthoredRangedDamageType = {
    id: 99,
    name: "test-cannon",
    ranged: true,
    projectileWidth: 11,
    orgDamageRatio: 21000,
    shotSound: "artillery-fire",
    shotAnim: "cannonVolley",
    maxRange: 400,
    damageModifierByTargetHp: { from: 0.9, to: 0.5, by: -0.15 },
    orgDamageModifierByTargetOrg: { from: 0.9, to: 0.65, by: -0.25 },
    ranges: [
      {
        from: 0.29,
        to: 0.56,
        damageModifier: { near: 1, far: 0.55 },
        engagementTier: 1,
      },
      {
        from: 0.56,
        to: 1.0,
        name: "long",
        damageModifier: { near: 0, far: -0.65 },
        orgDamageModifier: { near: 0, far: 0.31 },
        orgModifierByTargetOrg: { from: 0.9, to: 0.65, by: -0.35 },
      },
    ],
  };

  it("resolves band from/to fractions to absolute distances via maxRange", () => {
    const rt = normalizeRangedDamageType(authored);
    expect(rt.maxRange).toBe(400);
    expect(rt.ranges[0].start).toBeCloseTo(116, 5); // 0.29 * 400
    expect(rt.ranges[0].end).toBeCloseTo(224, 5); // 0.56 * 400
    expect(rt.ranges[1].start).toBeCloseTo(224, 5);
    expect(rt.ranges[1].end).toBe(400); // 1.0 * 400
  });

  it("maps damageModifier near/far to startMod/endMod", () => {
    const rt = normalizeRangedDamageType(authored);
    expect(rt.ranges[0].startMod).toBe(1);
    expect(rt.ranges[0].endMod).toBe(0.55);
    expect(rt.ranges[1].startMod).toBe(0);
    expect(rt.ranges[1].endMod).toBe(-0.65);
  });

  it("maps orgDamageModifier near/far to orgStartMod/orgEndMod, absent when unset", () => {
    const rt = normalizeRangedDamageType(authored);
    expect(rt.ranges[0].orgStartMod).toBeUndefined();
    expect(rt.ranges[0].orgEndMod).toBeUndefined();
    expect(rt.ranges[1].orgStartMod).toBe(0);
    expect(rt.ranges[1].orgEndMod).toBe(0.31);
  });

  it("converts target-stat modifiers from {from,to,by} to {start,end,modifier}", () => {
    const rt = normalizeRangedDamageType(authored);
    expect(rt.damageModifierByTargetHp).toEqual({
      start: 0.9,
      end: 0.5,
      modifier: -0.15,
    });
    expect(rt.orgModifierByTargetOrg).toEqual({
      start: 0.9,
      end: 0.65,
      modifier: -0.25,
    });
    expect(rt.ranges[1].orgModifierByTargetOrg).toEqual({
      start: 0.9,
      end: 0.65,
      modifier: -0.35,
    });
  });

  it("passes through name, engagementTier and non-range fields", () => {
    const rt = normalizeRangedDamageType(authored);
    expect(rt.ranges[1].name).toBe("long");
    expect(rt.ranges[0].engagementTier).toBe(1);
    expect(rt.orgDamageRatio).toBe(21000);
    expect(rt.projectileWidth).toBe(11);
    expect(rt.ranged).toBe(true);
  });
});

describe("normalizeDamageType", () => {
  it("passes melee types through unchanged", () => {
    const melee: MeleeDamageTypeTemplate = {
      id: 1,
      name: "bayonet",
      orgDamageRatio: 32000,
    };
    expect(normalizeDamageType(melee)).toBe(melee);
  });
});
