import {
  getLeagueBounds,
  getLeagueByElo,
  getLeagueProgress,
  hasReachedLeague,
  LeagueType,
} from "./league";

describe("getLeagueByElo()", () => {
  it("maps elo to the correct league at band boundaries", () => {
    expect(getLeagueByElo(549).type).toBe(LeagueType.Iron3);
    expect(getLeagueByElo(550).type).toBe(LeagueType.Iron2);
    expect(getLeagueByElo(650).type).toBe(LeagueType.Iron1);
    expect(getLeagueByElo(1349).type).toBe(LeagueType.Silver1);
    expect(getLeagueByElo(1350).type).toBe(LeagueType.Gold3);
    expect(getLeagueByElo(2249).type).toBe(LeagueType.Diamond1);
    expect(getLeagueByElo(2250).type).toBe(LeagueType.Emperor);
  });

  it("returns Iron3 for non-positive elo", () => {
    expect(getLeagueByElo(0).type).toBe(LeagueType.Iron3);
    expect(getLeagueByElo(-100).type).toBe(LeagueType.Iron3);
    expect(getLeagueByElo(449).type).toBe(LeagueType.Iron3);
  });

  it("returns Emperor for very large elo", () => {
    expect(getLeagueByElo(5000).type).toBe(LeagueType.Emperor);
    expect(getLeagueByElo(99999).type).toBe(LeagueType.Emperor);
  });

  it("degrades gracefully on non-finite input", () => {
    expect(getLeagueByElo(Number.POSITIVE_INFINITY).type).toBe(LeagueType.Emperor);
    expect(getLeagueByElo(Number.NEGATIVE_INFINITY).type).toBe(LeagueType.Iron3);
    expect(getLeagueByElo(Number.NaN).type).toBe(LeagueType.Iron3);
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

  it("treats Iron3's open lower bound as 0", () => {
    expect(getLeagueProgress(0)).toEqual({ current: 0, total: 550 });
    expect(getLeagueProgress(300)).toEqual({ current: 300, total: 550 });
    expect(getLeagueProgress(549)).toEqual({ current: 549, total: 550 });
  });
});

describe("getLeagueBounds()", () => {
  it("returns bounds for a known league", () => {
    expect(getLeagueBounds(LeagueType.Gold1)).toEqual({
      type: LeagueType.Gold1,
      minElo: 1550,
      maxElo: 1650,
    });
    expect(getLeagueBounds(LeagueType.Gold3)).toEqual({
      type: LeagueType.Gold3,
      minElo: 1350,
      maxElo: 1450,
    });
    expect(getLeagueBounds(LeagueType.Emperor)).toEqual({
      type: LeagueType.Emperor,
      minElo: 2250,
      maxElo: null,
    });
  });
});

describe("hasReachedLeague()", () => {
  it("returns true at or above the target league's lower bound", () => {
    expect(hasReachedLeague(1650, LeagueType.Platinum3)).toBe(true);
    expect(hasReachedLeague(2250, LeagueType.Emperor)).toBe(true);
    expect(hasReachedLeague(1950, LeagueType.Platinum3)).toBe(true);
  });

  it("returns false below the target league", () => {
    expect(hasReachedLeague(1649, LeagueType.Platinum3)).toBe(false);
    expect(hasReachedLeague(0, LeagueType.Emperor)).toBe(false);
  });

  it("treats Platinum1 as harder to reach than Platinum3", () => {
    expect(hasReachedLeague(1700, LeagueType.Platinum3)).toBe(true);
    expect(hasReachedLeague(1700, LeagueType.Platinum1)).toBe(false);
  });
});
