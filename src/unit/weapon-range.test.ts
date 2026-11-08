import {
  EngagementRange,
  GameDataManager,
  RangedDamageTypeTemplate,
} from "@lob-sdk/game-data-manager";
import {
  bindingWeapon,
  standoffDistance,
  usableMaxRange,
} from "./weapon-range";

const gameDataManager = GameDataManager.get("napoleonic");
const weapon = (name: string) =>
  gameDataManager.getDamageTypeByName<RangedDamageTypeTemplate>(name);

describe("usableMaxRange", () => {
  it("reaches only as far as the bands the tier unlocks", () => {
    const musket = weapon("musket");
    expect(usableMaxRange(musket, EngagementRange.Low)).toBeCloseTo(23.4, 2);
    expect(usableMaxRange(musket, EngagementRange.Medium)).toBeCloseTo(44.1, 2);
    expect(usableMaxRange(musket, EngagementRange.Max)).toBe(90);
  });

  it("returns null when every band is held at this tier", () => {
    expect(
      usableMaxRange(weapon("12lb-cannon-ball"), EngagementRange.Low),
    ).toBeNull();
  });
});

describe("bindingWeapon", () => {
  const guns = ["12lb-canister-fire", "12lb-cannon-ball"];

  it("is the longest-reaching weapon still firing", () => {
    expect(
      bindingWeapon(guns, EngagementRange.Medium, gameDataManager)?.weapon.name,
    ).toBe("12lb-cannon-ball");
  });

  it("falls back to the shorter weapon once the longer one holds fire", () => {
    expect(
      bindingWeapon(guns, EngagementRange.Low, gameDataManager)?.weapon.name,
    ).toBe("12lb-canister-fire");
  });

  it("is null for a unit with nothing to fire", () => {
    expect(bindingWeapon([], EngagementRange.Max, gameDataManager)).toBeNull();
  });
});

describe("standoffDistance", () => {
  const standoff = (
    rangedDamageTypes: string[],
    approachTier: EngagementRange,
    legacyStandoff?: number,
  ) =>
    standoffDistance({
      rangedDamageTypes,
      approachTier,
      legacyStandoff,
      gameDataManager,
    });

  it("stops where the approach tier reaches, each closing in further", () => {
    expect(standoff(["musket"], EngagementRange.Low)).toBeCloseTo(23.4, 2);
    expect(standoff(["musket"], EngagementRange.Medium)).toBeCloseTo(44.1, 2);
    expect(standoff(["musket"], EngagementRange.Max)).toBeCloseTo(90, 2);
  });

  it("closes a gun with only round shot to the tier's reach too", () => {
    expect(standoff(["12lb-cannon-ball"], EngagementRange.Medium)).toBeCloseTo(
      usableMaxRange(weapon("12lb-cannon-ball"), EngagementRange.Medium)!,
      6,
    );
  });

  it("takes the nearest reach when several weapons fire", () => {
    expect(
      standoff(["musket", "12lb-canister-fire"], EngagementRange.Max),
    ).toBeCloseTo(90, 2);
  });

  it("closes to contact when nothing fires at the tier", () => {
    expect(standoff([], EngagementRange.Max)).toBe(0);
  });

  it("honours a legacy absolute stand-off, still clamped to the reach", () => {
    expect(standoff(["musket"], EngagementRange.Max, 60)).toBe(60);
    expect(standoff(["musket"], EngagementRange.Low, 60)).toBeCloseTo(23.4, 2);
  });
});
