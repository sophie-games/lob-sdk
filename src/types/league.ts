/**
 * League system: maps player ELO to ranked tiers (Iron → Emperor).
 *
 * `LEAGUES` is the single source of truth, ordered low → high and
 * contiguous. Public functions are stateless and degrade gracefully on
 * non-finite input.
 */

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
  readonly type: LeagueType;
  /** Inclusive lower bound. `null` = open (lowest league). */
  readonly minElo: number | null;
  /** Exclusive upper bound. `null` = open (top league). */
  readonly maxElo: number | null;
}

export interface LeagueProgress {
  readonly current: number;
  readonly total: number;
}

/** All leagues, ordered low → high. Bands are contiguous and disjoint. */
export const LEAGUES: ReadonlyArray<LeagueBounds> = [
  { type: LeagueType.G1, minElo: null, maxElo: 550 },
  { type: LeagueType.G2, minElo: 550, maxElo: 650 },
  { type: LeagueType.G3, minElo: 650, maxElo: 750 },

  { type: LeagueType.F1, minElo: 750, maxElo: 850 },
  { type: LeagueType.F2, minElo: 850, maxElo: 950 },
  { type: LeagueType.F3, minElo: 950, maxElo: 1050 },

  { type: LeagueType.E1, minElo: 1050, maxElo: 1150 },
  { type: LeagueType.E2, minElo: 1150, maxElo: 1250 },
  { type: LeagueType.E3, minElo: 1250, maxElo: 1350 },

  { type: LeagueType.D1, minElo: 1350, maxElo: 1450 },
  { type: LeagueType.D2, minElo: 1450, maxElo: 1550 },
  { type: LeagueType.D3, minElo: 1550, maxElo: 1650 },

  { type: LeagueType.C1, minElo: 1650, maxElo: 1750 },
  { type: LeagueType.C2, minElo: 1750, maxElo: 1850 },
  { type: LeagueType.C3, minElo: 1850, maxElo: 1950 },

  { type: LeagueType.B1, minElo: 1950, maxElo: 2050 },
  { type: LeagueType.B2, minElo: 2050, maxElo: 2150 },
  { type: LeagueType.B3, minElo: 2150, maxElo: 2250 },

  { type: LeagueType.A, minElo: 2250, maxElo: null },
];

const TOP_LEAGUE = LEAGUES[LEAGUES.length - 1];
const BOTTOM_LEAGUE = LEAGUES[0];

/** Lazy type → bounds map; built on first lookup, never if unused. */
let boundsByTypeCache: ReadonlyMap<LeagueType, LeagueBounds> | null = null;
const boundsByType = (): ReadonlyMap<LeagueType, LeagueBounds> =>
  (boundsByTypeCache ??= new Map(LEAGUES.map((b) => [b.type, b])));

/**
 * Resolve the league band that contains `elo`. Read `.type` for the enum value.
 * Non-finite input: `+Infinity` → top, `-Infinity` / `NaN` → bottom.
 */
export function getLeagueByElo(elo: number): LeagueBounds {
  if (!Number.isFinite(elo)) {
    return elo === Number.POSITIVE_INFINITY ? TOP_LEAGUE : BOTTOM_LEAGUE;
  }
  for (const band of LEAGUES) {
    if (band.maxElo === null || elo < band.maxElo) return band;
  }
  return TOP_LEAGUE; // unreachable; last band has maxElo === null
}

/** O(1) bounds lookup for a given league type. */
export function getLeagueBounds(type: LeagueType): LeagueBounds {
  const entry = boundsByType().get(type);
  if (!entry) throw new Error(`Unknown league type: ${type}`);
  return entry;
}

/**
 * Progress within the current league as `current / total`. Returns `null` for
 * the top league. The bottom open-ended league treats its lower bound as 0.
 */
export function getLeagueProgress(elo: number): LeagueProgress | null {
  const band = getLeagueByElo(elo);
  if (band.maxElo === null) return null;
  const min = band.minElo ?? 0;
  const total = band.maxElo - min;
  const current = Math.max(0, Math.min(total, elo - min));
  return { current, total };
}

/** True iff `elo` places the player at `target` or any higher league. */
export function hasReachedLeague(elo: number, target: LeagueType): boolean {
  const min = getLeagueBounds(target).minElo;
  return min === null || elo >= min;
}
