import type { BrigadeSkins, EntityId, UnitCategoryId } from "@lob-sdk/types";

export interface OrganizationLabel {
  /** Literal template; {{n}} is replaced with the ordinal. */
  name?: string;
  /** Translation key in the common namespace; takes precedence over name. */
  titleKey?: string;
}

/** A division type and the rules used when an army has no authored organization. */
export interface DivisionDoctrine extends OrganizationLabel {
  id: string;
  categories: UnitCategoryId[];
  brigadeKind: string;
  maxTroops: number;
  maxPerBrigade: number;
  maxBrigades: number;
  /** These categories are spread evenly across divisions of this type. */
  distributedCategories?: UnitCategoryId[];
  /** Keep categories in different classes in separate divisions. */
  classes?: {
    categories: UnitCategoryId[];
    row: "front" | "rear";
    position: "centre" | "flanks";
  }[];
  row: "front" | "rear";
  position: "centre" | "flanks";
  /** Support assigned to this type, with any excess kept in its own divisions. */
  support?: { kind: string; maxBlocks: number; fasterThan?: string }[];
}

export interface OrganizationDoctrine {
  defaultDivisionKind: string;
  defaultBrigadeKind: string;
  divisions: DivisionDoctrine[];
  brigades: Record<string, OrganizationLabel>;
}

/** Explicit initial OOB for one scenario player; omitted units remain unassigned. */
export interface ScenarioOrganization {
  player: number;
  divisions: {
    kind?: string;
    name?: string;
    brigades: {
      kind?: string;
      name?: string;
      unitIds: EntityId[];
      skins?: BrigadeSkins;
    }[];
  }[];
}
