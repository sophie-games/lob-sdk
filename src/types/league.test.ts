import { LeagueManager, LeagueType } from "./league";

const leagues = LeagueManager.getInstance();

describe("leagues.getByElo()", () => {
  it("maps elo to the correct league at band boundaries", () => {
    expect(leagues.getByElo(549)).toBe(LeagueType.G1);
    expect(leagues.getByElo(550)).toBe(LeagueType.G2);
    expect(leagues.getByElo(1349)).toBe(LeagueType.E3);
    expect(leagues.getByElo(1350)).toBe(LeagueType.D1);
    expect(leagues.getByElo(2249)).toBe(LeagueType.B3);
    expect(leagues.getByElo(2250)).toBe(LeagueType.A);
  });

  it("clamps below the lowest band to G1", () => {
    expect(leagues.getByElo(0)).toBe(LeagueType.G1);
    expect(leagues.getByElo(-100)).toBe(LeagueType.G1);
    expect(leagues.getByElo(449)).toBe(LeagueType.G1);
  });

  it("clamps above the top band to A", () => {
    expect(leagues.getByElo(5000)).toBe(LeagueType.A);
    expect(leagues.getByElo(99999)).toBe(LeagueType.A);
  });
});

describe("leagues.getProgress()", () => {
  it("reports progress within the current band", () => {
    expect(leagues.getProgress(1380)).toEqual({ current: 30, total: 100 });
    expect(leagues.getProgress(550)).toEqual({ current: 0, total: 100 });
    expect(leagues.getProgress(649)).toEqual({ current: 99, total: 100 });
  });

  it("returns null for the top league", () => {
    expect(leagues.getProgress(2250)).toBeNull();
    expect(leagues.getProgress(9999)).toBeNull();
  });

  it("treats Iron I's open lower bound as 0", () => {
    expect(leagues.getProgress(0)).toEqual({ current: 0, total: 550 });
    expect(leagues.getProgress(300)).toEqual({ current: 300, total: 550 });
    expect(leagues.getProgress(549)).toEqual({ current: 549, total: 550 });
  });
});

describe("leagues.getBounds()", () => {
  it("returns bounds for a known league", () => {
    expect(leagues.getBounds(LeagueType.D1)).toEqual({
      type: LeagueType.D1,
      minElo: 1350,
      maxElo: 1450,
    });
    expect(leagues.getBounds(LeagueType.A)).toEqual({
      type: LeagueType.A,
      minElo: 2250,
      maxElo: null,
    });
  });
});

describe("leagues.hasReached()", () => {
  it("returns true when the elo is in the target league", () => {
    expect(leagues.hasReached(1650, LeagueType.C1)).toBe(true);
    expect(leagues.hasReached(2250, LeagueType.A)).toBe(true);
  });

  it("returns true when the elo is above the target league", () => {
    expect(leagues.hasReached(2250, LeagueType.C1)).toBe(true);
    expect(leagues.hasReached(1950, LeagueType.C1)).toBe(true);
  });

  it("returns false when the elo is below the target league", () => {
    expect(leagues.hasReached(1649, LeagueType.C1)).toBe(false);
    expect(leagues.hasReached(0, LeagueType.A)).toBe(false);
  });
});
