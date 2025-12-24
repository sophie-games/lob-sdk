import { GameDataManager } from "@lob-sdk/game-data-manager";
import { DynamicBattleType } from "@lob-sdk/types";
import { Army } from "@lob-sdk/types/army";

/**
 * Generates a default army configuration for a given battle type.
 * @param gameDataManager - The game data manager instance.
 * @param dynamicBattleType - The battle type to generate an army for.
 * @returns An Army object with the default unit composition for the battle type.
 */
export const generateDefaultArmy = (
  gameDataManager: GameDataManager,
  dynamicBattleType: DynamicBattleType
): Army => {
  const battleType = gameDataManager.getBattleType(dynamicBattleType);

  return {
    dynamicBattleType,
    units: battleType.defaultArmy,
  };
};
