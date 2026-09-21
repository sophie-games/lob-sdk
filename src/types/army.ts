import { DynamicBattleType } from "./server-game";
import { UnitCounts } from "./unit";
import type { ArmyOrganization } from "./army-organization";

export interface Army {
  dynamicBattleType: DynamicBattleType;
  units: UnitCounts;
  organization?: ArmyOrganization | null;
}
