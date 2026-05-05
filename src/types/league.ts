export enum LeagueType {
  /** Emperor */
  A = "a",

  /** Diamond III */
  B3 = "b3",
  /** Diamond II */
  B2 = "b2",
  /** Diamond I */
  B1 = "b1",

  /** Platinum III */
  C3 = "c3",
  /** Platinum II */
  C2 = "c2",
  /** Platinum I */
  C1 = "c1",

  /** Gold III */
  D3 = "d3",
  /** Gold II */
  D2 = "d2",
  /** Gold I */
  D1 = "d1",

  /** Silver III */
  E3 = "e3",
  /** Silver II */
  E2 = "e2",
  /** Silver I */
  E1 = "e1",

  /** Bronze III */
  F3 = "f3",
  /** Bronze II */
  F2 = "f2",
  /** Bronze I */
  F1 = "f1",

  /** Iron III */
  G3 = "g3",
  /** Iron II */
  G2 = "g2",
  /** Iron I */
  G1 = "g1",
}

export interface LeagueBounds {
  type: LeagueType;
  /** Inclusive lower bound. null = no lower bound (lowest league). */
  minElo: number | null;
  /** Exclusive upper bound. null = no upper bound (top league). */
  maxElo: number | null;
}

export interface LeagueProgress {
  current: number;
  total: number;
}

/**
 * League bands are uniform: every league spans BAND_SIZE elo, starting at MIN_ELO.
 * The indexed lookup in `LeagueManager.getByElo` relies on this invariant.
 */
const MIN_ELO = 450;
const BAND_SIZE = 100;

/**
 * ELO bounds for each league, ordered from lowest to highest.
 * Single source of truth for all league-to-ELO mappings.
 */
const LEAGUE_ELO_BOUNDS: ReadonlyArray<LeagueBounds> = [
  // Iron
  { type: LeagueType.G1, minElo: null, maxElo: 550 },
  { type: LeagueType.G2, minElo: 550, maxElo: 650 },
  { type: LeagueType.G3, minElo: 650, maxElo: 750 },

  // Bronze
  { type: LeagueType.F1, minElo: 750, maxElo: 850 },
  { type: LeagueType.F2, minElo: 850, maxElo: 950 },
  { type: LeagueType.F3, minElo: 950, maxElo: 1050 },

  // Silver
  { type: LeagueType.E1, minElo: 1050, maxElo: 1150 },
  { type: LeagueType.E2, minElo: 1150, maxElo: 1250 },
  { type: LeagueType.E3, minElo: 1250, maxElo: 1350 },

  // Gold
  { type: LeagueType.D1, minElo: 1350, maxElo: 1450 },
  { type: LeagueType.D2, minElo: 1450, maxElo: 1550 },
  { type: LeagueType.D3, minElo: 1550, maxElo: 1650 },

  // Platinum
  { type: LeagueType.C1, minElo: 1650, maxElo: 1750 },
  { type: LeagueType.C2, minElo: 1750, maxElo: 1850 },
  { type: LeagueType.C3, minElo: 1850, maxElo: 1950 },

  // Diamond
  { type: LeagueType.B1, minElo: 1950, maxElo: 2050 },
  { type: LeagueType.B2, minElo: 2050, maxElo: 2150 },
  { type: LeagueType.B3, minElo: 2150, maxElo: 2250 },

  // Emperor
  { type: LeagueType.A, minElo: 2250, maxElo: null },
];

/**
 * Lazy singleton — call {@link LeagueManager.getInstance}. The internal
 * lookup tables are only built on first access, so importing this module
 * costs nothing if no league logic ends up running.
 */
export class LeagueManager {
  private static _instance: LeagueManager | null = null;

  /** All leagues ordered low-to-high. */
  readonly bounds: ReadonlyArray<LeagueBounds> = LEAGUE_ELO_BOUNDS;

  private readonly byType: ReadonlyMap<LeagueType, LeagueBounds>;
  private readonly indexed: ReadonlyArray<LeagueType>;

  private constructor() {
    this.byType = new Map(LEAGUE_ELO_BOUNDS.map((b) => [b.type, b]));
    this.indexed = LEAGUE_ELO_BOUNDS.map((b) => b.type);
  }

  static getInstance(): LeagueManager {
    return (LeagueManager._instance ??= new LeagueManager());
  }

  /** O(1) elo → league lookup. */
  getByElo(elo: number): LeagueType {
    const idx = Math.floor((elo - MIN_ELO) / BAND_SIZE);
    if (idx <= 0) return this.indexed[0];
    if (idx >= this.indexed.length) return this.indexed[this.indexed.length - 1];
    return this.indexed[idx];
  }

  /** O(1) bounds lookup for a given league. */
  getBounds(type: LeagueType): LeagueBounds {
    const entry = this.byType.get(type);
    if (!entry) throw new Error(`Unknown league type: ${type}`);
    return entry;
  }

  /**
   * Progress within the current league as `current / total`. Used to show how
   * close a player is to the next league without exposing the raw ELO number.
   *
   * Returns null for the top league (Emperor) since there is no next league.
   * For the bottom open-ended league, the lower bound is treated as 0.
   */
  getProgress(elo: number): LeagueProgress | null {
    const entry = this.getBounds(this.getByElo(elo));
    if (entry.maxElo === null) return null;
    const min = entry.minElo ?? 0;
    const total = entry.maxElo - min;
    const current = Math.max(0, Math.min(total, elo - min));
    return { current, total };
  }

  /**
   * True iff `elo` places the player at `target` or any higher league.
   * Used by achievements that fire when a player reaches a given league tier.
   */
  hasReached(elo: number, target: LeagueType): boolean {
    const min = this.getBounds(target).minElo;
    return min === null || elo >= min;
  }
}

