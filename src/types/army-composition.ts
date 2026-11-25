import type { ArmyOrganization } from "./army-organization";
import type { UnitCounts } from "./unit";

export const ARMY_COMPOSITION_VERSION = 1 as const;

/** A saved army preset, including both its roster and command structure. */
export interface ArmyComposition {
  version: typeof ARMY_COMPOSITION_VERSION;
  units: UnitCounts;
  organization: ArmyOrganization | null;
}
