import {
  isPlayerInfoRedactedBattleIntel,
  type PlayerInfo,
  UserTier,
} from "./player";

function basePlayer(overrides: Partial<PlayerInfo> = {}): PlayerInfo {
  return {
    userId: 1,
    username: "u",
    playerNumber: 1,
    team: 1,
    elo: 1000,
    eloBefore: null,
    eloChange: 0,
    basicCurrencyEarned: null,
    premiumCurrencyEarned: null,
    result: null,
    passed: false,
    defeated: false,
    consecutiveUnplayedTurns: 0,
    ticksUnderPressure: null,
    userTier: UserTier.Free,
    turnSubmission: null,
    wantsDraw: false,
    armyComposition: {},
    metadata: {},
    unitsGained: null,
    ammoReserve: 0,
    baseAmmoReserve: 0,
    currentTimeBankSeconds: 0,
    submittedAt: null,
    lostAt: null,
    lostReason: null,
    ...overrides,
  };
}

describe("isPlayerInfoRedactedBattleIntel", () => {
  it("narrows when live game row has withheld counts and vp aggregate", () => {
    const p = basePlayer({
      armyComposition: null,
      unitsGained: null,
      metadata: null,
      vpBaseArmyPower: 200,
    });
    expect(isPlayerInfoRedactedBattleIntel(p, { finished: false })).toBe(true);
    if (isPlayerInfoRedactedBattleIntel(p, { finished: false })) {
      expect(p.vpBaseArmyPower).toBe(200);
      expect(p.armyComposition).toBeNull();
    }
  });

  it("is false when game finished", () => {
    const p = basePlayer({
      armyComposition: null,
      vpBaseArmyPower: 200,
    });
    expect(isPlayerInfoRedactedBattleIntel(p, { finished: true })).toBe(false);
  });

  it("is false when composition is present (ally / post-game)", () => {
    const p = basePlayer({
      armyComposition: { 1: 2 } as PlayerInfo["armyComposition"],
      vpBaseArmyPower: 200,
    });
    expect(isPlayerInfoRedactedBattleIntel(p, { finished: false })).toBe(false);
  });

  it("is false when vp aggregate missing (invalid / non-redacted row)", () => {
    const p = basePlayer({
      armyComposition: null,
      vpBaseArmyPower: null,
    });
    expect(isPlayerInfoRedactedBattleIntel(p, { finished: false })).toBe(false);
  });
});
