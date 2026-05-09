import {
  getEloAboveTopLeague,
  getLeagueBounds,
  getLeagueByElo,
  getLeagueProgress,
  hasReachedLeague,
  LeagueType,
} from "./league";

describe("getLeagueByElo()", () => {
  it("maps elo to the correct league at band boundaries", () => {
    expect(getLeagueByElo(874).type).toBe(LeagueType.Iron1);
    expect(getLeagueByElo(875).type).toBe(LeagueType.Iron2);
    expect(getLeagueByElo(925).type).toBe(LeagueType.Iron3);
    expect(getLeagueByElo(1274).type).toBe(LeagueType.Silver3);
    expect(getLeagueByElo(1275).type).toBe(LeagueType.Gold1);
    expect(getLeagueByElo(2024).type).toBe(LeagueType.Diamond3);
    expect(getLeagueByElo(2025).type).toBe(LeagueType.Emperor);
  });

  it("returns Iron1 for non-positive elo", () => {
    expect(getLeagueByElo(0).type).toBe(LeagueType.Iron1);
    expect(getLeagueByElo(-100).type).toBe(LeagueType.Iron1);
    expect(getLeagueByElo(800).type).toBe(LeagueType.Iron1);
  });

  it("returns Emperor for very large elo", () => {
    expect(getLeagueByElo(5000).type).toBe(LeagueType.Emperor);
    expect(getLeagueByElo(99999).type).toBe(LeagueType.Emperor);
  });

  it("degrades gracefully on non-finite input", () => {
    expect(getLeagueByElo(Number.POSITIVE_INFINITY).type).toBe(LeagueType.Emperor);
    expect(getLeagueByElo(Number.NEGATIVE_INFINITY).type).toBe(LeagueType.Iron1);
    expect(getLeagueByElo(Number.NaN).type).toBe(LeagueType.Iron1);
  });
});

describe("getLeagueProgress()", () => {
  it("reports progress within the current band", () => {
    expect(getLeagueProgress(1300)).toEqual({ current: 25, total: 75 });
    expect(getLeagueProgress(875)).toEqual({ current: 0, total: 50 });
    expect(getLeagueProgress(924)).toEqual({ current: 49, total: 50 });
  });

  it("returns null for the top league", () => {
    expect(getLeagueProgress(2025)).toBeNull();
    expect(getLeagueProgress(9999)).toBeNull();
  });

  it("treats Iron1's open lower bound as 0", () => {
    expect(getLeagueProgress(0)).toEqual({ current: 0, total: 875 });
    expect(getLeagueProgress(300)).toEqual({ current: 300, total: 875 });
    expect(getLeagueProgress(874)).toEqual({ current: 874, total: 875 });
  });
});

describe("getEloAboveTopLeague()", () => {
  it("returns elo over the top league threshold for Emperor players", () => {
    expect(getEloAboveTopLeague(2025)).toBe(0);
    expect(getEloAboveTopLeague(2150)).toBe(125);
    expect(getEloAboveTopLeague(9999)).toBe(7974);
  });

  it("returns null below the top league", () => {
    expect(getEloAboveTopLeague(2024)).toBeNull();
    expect(getEloAboveTopLeague(0)).toBeNull();
    expect(getEloAboveTopLeague(-100)).toBeNull();
  });

  it("returns null on non-finite input", () => {
    expect(getEloAboveTopLeague(Number.POSITIVE_INFINITY)).toBeNull();
    expect(getEloAboveTopLeague(Number.NEGATIVE_INFINITY)).toBeNull();
    expect(getEloAboveTopLeague(Number.NaN)).toBeNull();
  });
});

describe("getLeagueBounds()", () => {
  it("returns bounds for a known league", () => {
    expect(getLeagueBounds(LeagueType.Gold1)).toEqual({
      type: LeagueType.Gold1,
      minElo: 1275,
      maxElo: 1350,
    });
    expect(getLeagueBounds(LeagueType.Gold3)).toEqual({
      type: LeagueType.Gold3,
      minElo: 1425,
      maxElo: 1500,
    });
    expect(getLeagueBounds(LeagueType.Emperor)).toEqual({
      type: LeagueType.Emperor,
      minElo: 2025,
      maxElo: null,
    });
  });
});

describe("hasReachedLeague()", () => {
  it("returns true at or above the target league's lower bound", () => {
    expect(hasReachedLeague(1650, LeagueType.Platinum3)).toBe(true);
    expect(hasReachedLeague(2025, LeagueType.Emperor)).toBe(true);
    expect(hasReachedLeague(1725, LeagueType.Platinum3)).toBe(true);
  });

  it("returns false below the target league", () => {
    expect(hasReachedLeague(1649, LeagueType.Platinum3)).toBe(false);
    expect(hasReachedLeague(0, LeagueType.Emperor)).toBe(false);
  });

  it("treats Platinum3 as harder to reach than Platinum1", () => {
    expect(hasReachedLeague(1600, LeagueType.Platinum1)).toBe(true);
    expect(hasReachedLeague(1600, LeagueType.Platinum3)).toBe(false);
  });
});
