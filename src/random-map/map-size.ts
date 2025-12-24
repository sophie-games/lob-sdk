import {
  TeamDeploymentZone,
  MapSize,
  DynamicBattleType,
  Size,
} from "@lob-sdk/types";
import mapSizesJson from "@lob-sdk/game-data/shared/map-sizes.json";

const mapSizes = mapSizesJson as Record<
  Size,
  {
    map: MapSize;
    deployment: { width: number; height: number; zoneSeparation: number };
  }
>;

export const getMapSize = (size: Size): MapSize => {
  return mapSizes[size].map;
};

export const getDeploymentZoneBySize = (
  size: Size,
  mapWidth: number,
  mapHeight: number,
  team: number
): TeamDeploymentZone => {
  let zoneSettings = mapSizes[size].deployment;

  // Calculate centered X coordinate
  const x = (mapWidth - zoneSettings.width) / 2;

  // Calculate Y coordinate, centering zones vertically with zoneSeparation
  const totalHeight = 2 * zoneSettings.height + zoneSettings.zoneSeparation;
  const y =
    team === 1
      ? (mapHeight + totalHeight) / 2 - zoneSettings.height
      : (mapHeight - totalHeight) / 2;

  return { team, width: zoneSettings.width, height: zoneSettings.height, x, y };
};

export const getBattleSizeByMode = (
  dynamicBattleType: DynamicBattleType,
  players: number
): Size => {
  switch (dynamicBattleType) {
    case DynamicBattleType.Clash: {
      if (players > 2) return Size.Medium;

      return Size.Small;
    }

    case DynamicBattleType.Combat: {
      if (players > 2) return Size.Large;

      return Size.Medium;
    }

    case DynamicBattleType.Battle: {
      if (players > 2) return Size.ExtraLarge;

      return Size.Large;
    }

    case DynamicBattleType.GrandBattle: {
      return Size.ExtraLarge;
    }

    default:
      return Size.Medium;
  }
};
