/**
 * Calculates the map size index based on the number of players.
 * Every 2 players the array index increases by one, unless
 * the last index is reached, in that case, the last index is used.
 *
 * @param maxPlayers - Maximum number of players
 * @param mapSizeArrayLength - Length of the mapSize array
 * @returns The index to use in the mapSize array
 */
export const getMapSizeIndex = (
  maxPlayers: number,
  mapSizeArrayLength: number
): number => {
  // Calculate index: every 2 players increases index by 1
  // For 2 players: index 0, for 4 players: index 1, etc.
  const calculatedIndex = Math.floor(maxPlayers / 2) - 1;

  // Clamp to valid array bounds: [0, mapSizeArrayLength - 1]
  return Math.max(0, Math.min(calculatedIndex, mapSizeArrayLength - 1));
};
