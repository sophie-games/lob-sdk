import { EntityId } from "@lob-sdk/types";

export enum VisionLevel {
  NotVisible = 0,
  VisibleFullyUnknown = 1,
  VisiblePartiallyUnknown = 2,
  VisibleWithoutBars = 3,
  FullyVisible = 4,
}

/**
 * Whether there is fog of war, and whose eyes grade an enemy unit. Allies stay
 * fully visible to each other under both fogged modes; only enemy detection
 * changes.
 */
export enum FogOfWarMode {
  /** No fog: everything is visible to everyone. */
  Off = 0,
  /** Every player on a team sees what any of their units can see. */
  Team = 1,
  /** Each player only sees what their own units can see. */
  Player = 2,
}

export interface FogOfWarResult {
  unitVisionLevels: Map<EntityId, VisionLevel>; // Map of unit IDs to their vision levels
}

export interface IServerFogOfWarService {}
