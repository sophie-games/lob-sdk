import { EntityId } from "@lob-sdk/types";

export enum VisionLevel {
  NotVisible = 0,
  VisibleFullyUnknown = 1,
  VisiblePartiallyUnknown = 2,
  VisibleWithoutBars = 3,
  FullyVisible = 4,
}

/**
 * Whose eyes grade an enemy unit. Allies stay fully visible to each other under
 * both modes; only enemy detection changes.
 */
export enum FogOfWarMode {
  /** Every player on a team sees what any of their units can see. */
  Team = 0,
  /** Each player only sees what their own units can see. */
  Player = 1,
}

export interface FogOfWarResult {
  unitVisionLevels: Map<EntityId, VisionLevel>; // Map of unit IDs to their vision levels
}

export interface IServerFogOfWarService {}
