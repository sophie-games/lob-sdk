import { TeamDeploymentZone, DynamicBattleType, Size } from "@lob-sdk/types";
import { GameEra, GameDataManager } from "@lob-sdk/game-data-manager";

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

export const getBattleSizeByMode = (
  dynamicBattleType: DynamicBattleType,
  players: number,
  era: GameEra
): Size => {
  const gameDataManager = GameDataManager.get(era);
  const { DEFAULT_BATTLE_TYPE } = gameDataManager.getGameConstants();
  
  switch (dynamicBattleType) {
    case "clash": {
      if (players > 2) return Size.Medium;

      return Size.Small;
    }

    case DEFAULT_BATTLE_TYPE: {
      if (players > 2) return Size.Large;

      return Size.Medium;
    }

    case "battle": {
      if (players > 2) return Size.ExtraLarge;

      return Size.Large;
    }

    case "grand_battle": {
      return Size.ExtraLarge;
    }

    default:
      return Size.Medium;
  }
};
