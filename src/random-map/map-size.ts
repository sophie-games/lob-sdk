import { TeamDeploymentZone, Size } from "@lob-sdk/types";
import { GameEra, GameDataManager } from "@lob-sdk/game-data-manager";

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

export const getDeploymentZoneBySize = (
  size: Size,
  mapWidth: number,
  mapHeight: number,
  team: number,
  era: GameEra,
  tileSize: number
): TeamDeploymentZone => {
  const mapSizes = GameDataManager.get(era).getMapSizes();
  let zoneSettings = mapSizes[size].deployment;

  // Convert tiles to pixels
  const zoneWidth = zoneSettings.tilesX * tileSize;
  const zoneHeight = zoneSettings.tilesY * tileSize;
  const zoneSeparation = zoneSettings.zoneSeparation * tileSize;

  // Calculate centered X coordinate
  const x = (mapWidth - zoneWidth) / 2;

  // Calculate Y coordinate, centering zones vertically with zoneSeparation
  const totalHeight = 2 * zoneHeight + zoneSeparation;
  const y =
    team === 1
      ? (mapHeight + totalHeight) / 2 - zoneHeight
      : (mapHeight - totalHeight) / 2;

  return { team, width: zoneWidth, height: zoneHeight, x, y };
};
