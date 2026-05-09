/**
 * League system: maps player ELO to ranked tiers (Iron → Emperor).
 *
 * `LEAGUES` is the single source of truth, ordered low → high and
 * contiguous. Public functions are stateless and degrade gracefully on
 * non-finite input.
 */

export enum LeagueType {
  Emperor = "emperor",

  Diamond1 = "diamond-1",
  Diamond2 = "diamond-2",
  Diamond3 = "diamond-3",

  Platinum1 = "platinum-1",
  Platinum2 = "platinum-2",
  Platinum3 = "platinum-3",

  Gold1 = "gold-1",
  Gold2 = "gold-2",
  Gold3 = "gold-3",

  Silver1 = "silver-1",
  Silver2 = "silver-2",
  Silver3 = "silver-3",

  Bronze1 = "bronze-1",
  Bronze2 = "bronze-2",
  Bronze3 = "bronze-3",

  Iron1 = "iron-1",
  Iron2 = "iron-2",
  Iron3 = "iron-3",
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

/**
 * All leagues, ordered low → high. Bands are contiguous and disjoint.
 * Within each tier, sub-tier `III` is the top and `I` is the bottom.
 */
export const LEAGUES: ReadonlyArray<LeagueBounds> = [
  { type: LeagueType.Iron1, minElo: null, maxElo: 875 },
  { type: LeagueType.Iron2, minElo: 875, maxElo: 925 },
  { type: LeagueType.Iron3, minElo: 925, maxElo: 975 },

  { type: LeagueType.Bronze1, minElo: 975, maxElo: 1025 },
  { type: LeagueType.Bronze2, minElo: 1025, maxElo: 1075 },
  { type: LeagueType.Bronze3, minElo: 1075, maxElo: 1125 },

  { type: LeagueType.Silver1, minElo: 1125, maxElo: 1175 },
  { type: LeagueType.Silver2, minElo: 1175, maxElo: 1225 },
  { type: LeagueType.Silver3, minElo: 1225, maxElo: 1275 },

  { type: LeagueType.Gold1, minElo: 1275, maxElo: 1350 },
  { type: LeagueType.Gold2, minElo: 1350, maxElo: 1425 },
  { type: LeagueType.Gold3, minElo: 1425, maxElo: 1500 },

  { type: LeagueType.Platinum1, minElo: 1500, maxElo: 1575 },
  { type: LeagueType.Platinum2, minElo: 1575, maxElo: 1650 },
  { type: LeagueType.Platinum3, minElo: 1650, maxElo: 1725 },

  { type: LeagueType.Diamond1, minElo: 1725, maxElo: 1825 },
  { type: LeagueType.Diamond2, minElo: 1825, maxElo: 1925 },
  { type: LeagueType.Diamond3, minElo: 1925, maxElo: 2025 },

  { type: LeagueType.Emperor, minElo: 2025, maxElo: null },
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

/**
 * ELO above the top league's lower bound, or `null` if the player isn't in
 * the top league. Used to surface progression past the top threshold, since
 * `getLeagueProgress` returns `null` for the unbounded top band.
 */
export function getEloAboveTopLeague(elo: number): number | null {
  if (!Number.isFinite(elo)) return null;
  const min = TOP_LEAGUE.minElo;
  if (min === null || elo < min) return null;
  return elo - min;
}

/** True iff `elo` places the player at `target` or any higher league. */
export function hasReachedLeague(elo: number, target: LeagueType): boolean {
  const min = getLeagueBounds(target).minElo;
  return min === null || elo >= min;
}
