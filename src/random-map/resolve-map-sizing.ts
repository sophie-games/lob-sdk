import { GameDataManager } from "@lob-sdk/game-data-manager";
import { GenerateRandomMapProps } from "@lob-sdk/types";
import { getMapSizeIndex } from "./map-size";
import type { MapSizing } from "./sized-map-generator";

/** The battle size and map sizes a generation uses, from the era's game data. */
export const resolveMapSizing = ({
  era,
  dynamicBattleType,
  maxPlayers,
  mapSize,
}: GenerateRandomMapProps): MapSizing => {
  const gameDataManager = GameDataManager.get(era);
  // Fixed-roster scenarios (presets) pass `dynamicBattleType: null`.
  // Fall back to the era's DEFAULT_BATTLE_TYPE so downstream consumers
  // (NaturalPath amount scaling, scaledZones, procedural-zone defaults,
  // procedural-tile defaults) always have a battleSize to work with.
  const resolvedBattleType =
    dynamicBattleType ?? gameDataManager.getGameConstants().DEFAULT_BATTLE_TYPE;
  const battleType = gameDataManager.getBattleType(resolvedBattleType);
  const mapSizeIndex = getMapSizeIndex(maxPlayers, battleType.mapSize.length);
  // Caller-supplied `mapSize` override wins; otherwise derive from the
  // player-count heuristic against `battleType.mapSize`.
  return {
    battleSize: mapSize ?? battleType.mapSize[mapSizeIndex],
    mapSizes: gameDataManager.getMapSizes(),
  };
};
