import type { UnitCounts, UnitType } from "./unit";

export const ARMY_ORGANIZATION_VERSION = 1 as const;

/** Skin id chosen for each unit type in a brigade. */
export type BrigadeSkins = Partial<Record<UnitType, number>>;

export interface ArmyOrganizationBrigade {
  kind: string;
  name?: string;
  units: UnitCounts;
  skins?: BrigadeSkins;
}

export interface ArmyOrganizationDivision {
  kind: string;
  name?: string;
  brigades: ArmyOrganizationBrigade[];
}

/** A saved army-composition OOB. Counts are materialized into unit IDs at game start. */
export interface ArmyOrganization {
  version: typeof ARMY_ORGANIZATION_VERSION;
  divisions: ArmyOrganizationDivision[];
}
