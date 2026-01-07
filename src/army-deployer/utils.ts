import { GameDataManager } from "@lob-sdk/game-data-manager";
import { DynamicBattleType } from "@lob-sdk/types";
import { Army } from "@lob-sdk/types/army";

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
