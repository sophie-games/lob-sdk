import { GameSpeed } from "../game-time-preset/game-time-preset";

/**
 * Matchmaking ELO constants
 */
export const MIN_MATCHMAKING_ELO = 1000;
export const MAX_MATCHMAKING_ELO = 1650;
export const BASE_ELO_RANGE = 100;
export const ELO_RANGE_INCREMENT = 40;

/**
 * Interval (in seconds) at which the ELO range expands by `ELO_RANGE_INCREMENT`,
 * keyed by game speed.
 *
 * - Fast (~20s lifetime in queue): 10s. The range covers a meaningful spread
 *   within the queue lifetime.
 * - Slow (up to 1 day lifetime in queue): 60s. 6x slower expansion gives more
 *   time for tighter matches; saturates the full ELO spectrum in ~1h, which
 *   is still negligible compared to a 1-day queue.
 */
export const ELO_RANGE_INTERVAL_SECONDS_BY_SPEED: Record<GameSpeed, number> = {
  [GameSpeed.Fast]: 10,
  [GameSpeed.Slow]: 60,
};

/**
 * Maximum number of matchmaking presets a user can submit at once.
 * Shared between client (UI limit) and server (validation).
 */
export const MAX_MATCHMAKING_SETTINGS = 4;

/**
 * Calculates the ELO range based on the time spent in the matchmaking queue.
 * The range starts at BASE_ELO_RANGE and increases by ELO_RANGE_INCREMENT
 * every `ELO_RANGE_INTERVAL_SECONDS_BY_SPEED[gameSpeed]` seconds, without
 * an upper cap (so that players in the long tail of the ELO distribution
 * eventually find matches).
 *
 * @param createdAtTime - The timestamp when the user joined the queue (in milliseconds)
 * @param nowTime - The current timestamp (in milliseconds)
 * @param gameSpeed - The game speed (Fast or Slow), determines the expansion rate
 * @returns The ELO range (half-range, so ±range from the user's ELO)
 */
export function getEloRangeByTime(
  createdAtTime: number,
  nowTime: number,
  gameSpeed: GameSpeed
): number {
  const timeDiffSeconds = Math.max(
    Math.floor((nowTime - createdAtTime) / 1000),
    0
  );

  const intervalSeconds = ELO_RANGE_INTERVAL_SECONDS_BY_SPEED[gameSpeed];
  const increments = Math.floor(timeDiffSeconds / intervalSeconds);

  return BASE_ELO_RANGE + increments * ELO_RANGE_INCREMENT;
}
