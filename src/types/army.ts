import { DynamicBattleType } from "./server-game";
import { UnitCounts } from "./unit";

export interface Army {
  dynamicBattleType: DynamicBattleType;
  units: UnitCounts;
}
