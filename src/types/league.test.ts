import {
  getLeagueBounds,
  getLeagueByElo,
  getLeagueProgress,
  hasReachedLeague,
  LeagueType,
} from "./league";

describe("getLeagueByElo()", () => {
  it("maps elo to the correct league at band boundaries", () => {
    expect(getLeagueByElo(549).type).toBe(LeagueType.G1);
    expect(getLeagueByElo(550).type).toBe(LeagueType.G2);
    expect(getLeagueByElo(1349).type).toBe(LeagueType.E3);
    expect(getLeagueByElo(1350).type).toBe(LeagueType.D1);
    expect(getLeagueByElo(2249).type).toBe(LeagueType.B3);
    expect(getLeagueByElo(2250).type).toBe(LeagueType.A);
  });

  it("returns the lowest band for non-positive elo", () => {
    expect(getLeagueByElo(0).type).toBe(LeagueType.G1);
    expect(getLeagueByElo(-100).type).toBe(LeagueType.G1);
    expect(getLeagueByElo(449).type).toBe(LeagueType.G1);
  });

  it("returns the top band for very large elo", () => {
    expect(getLeagueByElo(5000).type).toBe(LeagueType.A);
    expect(getLeagueByElo(99999).type).toBe(LeagueType.A);
  });

  it("degrades gracefully on non-finite input", () => {
    expect(getLeagueByElo(Number.POSITIVE_INFINITY).type).toBe(LeagueType.A);
    expect(getLeagueByElo(Number.NEGATIVE_INFINITY).type).toBe(LeagueType.G1);
    expect(getLeagueByElo(Number.NaN).type).toBe(LeagueType.G1);
  });
});

describe("getLeagueProgress()", () => {
  it("reports progress within the current band", () => {
    expect(getLeagueProgress(1380)).toEqual({ current: 30, total: 100 });
    expect(getLeagueProgress(550)).toEqual({ current: 0, total: 100 });
    expect(getLeagueProgress(649)).toEqual({ current: 99, total: 100 });
  });

  it("returns null for the top league", () => {
    expect(getLeagueProgress(2250)).toBeNull();
    expect(getLeagueProgress(9999)).toBeNull();
  });

  it("treats Iron I's open lower bound as 0", () => {
    expect(getLeagueProgress(0)).toEqual({ current: 0, total: 550 });
    expect(getLeagueProgress(300)).toEqual({ current: 300, total: 550 });
    expect(getLeagueProgress(549)).toEqual({ current: 549, total: 550 });
  });
});

describe("getLeagueBounds()", () => {
  it("returns bounds for a known league", () => {
    expect(getLeagueBounds(LeagueType.D1)).toEqual({
      type: LeagueType.D1,
      minElo: 1350,
      maxElo: 1450,
    });
    expect(getLeagueBounds(LeagueType.A)).toEqual({
      type: LeagueType.A,
      minElo: 2250,
      maxElo: null,
    });
  });
});

describe("hasReachedLeague()", () => {
  it("returns true when the elo is in the target league", () => {
    expect(hasReachedLeague(1650, LeagueType.C1)).toBe(true);
    expect(hasReachedLeague(2250, LeagueType.A)).toBe(true);
  });

  it("returns true when the elo is above the target league", () => {
    expect(hasReachedLeague(2250, LeagueType.C1)).toBe(true);
    expect(hasReachedLeague(1950, LeagueType.C1)).toBe(true);
  });

  it("returns false when the elo is below the target league", () => {
    expect(hasReachedLeague(1649, LeagueType.C1)).toBe(false);
    expect(hasReachedLeague(0, LeagueType.A)).toBe(false);
  });
});
