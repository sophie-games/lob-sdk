import { Point2, Vector2 } from "@lob-sdk/vector";
import { EntityId } from "@lob-sdk/types";
import { GameDataManager } from "@lob-sdk/game-data-manager";

export enum ObjectiveType {
  Small = 1,
  Big = 2,
}

export interface IObjective {
  id: EntityId;
  position: Vector2;
  player: number;
  team: number;
  type: ObjectiveType;
  logistics?: number;
  manpowerPerTurn?: number;
  goldPerTurn?: number;
  /** Accumulated manpower resources */
  manpower?: number;
  /** Accumulated gold resources */
  gold?: number;
  /**
   * Gets the effective victory points for this objective.
   * If victoryPoints undefined, returns the default value based on objective type.
   * @param gameDataManager - The game data manager to access game constants
   * @returns The effective victory points value
   */
  getVictoryPoints(gameDataManager: GameDataManager): number;
}

export interface ObjectiveDtoBase {
  name?: string;
  player?: number;
  team?: number;
  pos: Point2;
  captureProgress?: number;
  type?: ObjectiveType;
  lo?: number;
  /** Manpower generated per turn */
  mp?: number;
  /** Gold generated per turn */
  gp?: number;
  /** Accumulated manpower resources */
  m?: number;
  /** Accumulated gold resources */
  g?: number;
  /** Victory points */
  vp?: number;
}

export type ObjectiveDto<T extends boolean = true> = T extends true
  ? ObjectiveDtoBase & { id: EntityId } // `id` is required by default
  : ObjectiveDtoBase & Partial<{ id: EntityId }>; // `id` is optional

// `id` is required
export interface ObjectiveDtoWithId extends ObjectiveDtoBase {
  id: EntityId;
}
