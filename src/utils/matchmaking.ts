/**
 * Matchmaking ELO constants
 */
export const MIN_MATCHMAKING_ELO = 1000;
export const MAX_MATCHMAKING_ELO = 1650;
export const BASE_ELO_RANGE = 100;
export const ELO_RANGE_INCREMENT = 40;
export const ELO_RANGE_INTERVAL_SECONDS = 10;
export const MAX_ELO_RANGE = 400;

/**
 * Calculates the ELO range based on the time spent in the matchmaking queue.
 * The range starts at BASE_ELO_RANGE and increases by ELO_RANGE_INCREMENT
 * every ELO_RANGE_INTERVAL_SECONDS seconds, up to MAX_ELO_RANGE.
 *
 * @param createdAtTime - The timestamp when the user joined the queue (in milliseconds)
 * @param nowTime - The current timestamp (in milliseconds)
 * @returns The ELO range (half-range, so ±range from the user's ELO)
 */
export function getEloRangeByTime(
  createdAtTime: number,
  nowTime: number
): number {
  // Calculate time difference in seconds
  const timeDiffSeconds = Math.max(
    Math.floor((nowTime - createdAtTime) / 1000),
    0
  );

  const increments = Math.floor(timeDiffSeconds / ELO_RANGE_INTERVAL_SECONDS);
  const score = BASE_ELO_RANGE + increments * ELO_RANGE_INCREMENT;

  return Math.min(score, MAX_ELO_RANGE);
}


