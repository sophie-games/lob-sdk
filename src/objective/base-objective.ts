import { Entity, EntityType } from "@lob-sdk/entity";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { ObjectiveType } from "@lob-sdk/types";
import { Vector2 } from "@lob-sdk/vector";

export abstract class BaseObjective extends Entity {
  readonly entityType = EntityType.Objective;
  abstract position: Vector2;
  abstract player: number;
  abstract team: number;
  abstract type: ObjectiveType;
  abstract logistics?: number;
  abstract manpowerPerTurn?: number;
  abstract goldPerTurn?: number;
  /** Accumulated manpower resources */
  abstract manpower?: number;
  /** Accumulated gold resources */
  abstract gold?: number;
  protected abstract _victoryPoints?: number;

  /**
   * Gets the effective victory points for this objective.
   * If victoryPoints undefined, returns the default value based on objective type.
   * @param gameDataManager - The game data manager to access game constants
   * @returns The effective victory points value
   */
  getVictoryPoints(gameDataManager: GameDataManager): number {
    // If victory points are explicitly set and not 0, use them
    if (this._victoryPoints !== undefined) {
      return this._victoryPoints;
    }

    // Otherwise, use default based on objective type
    const { VP_BIG_DEFAULT_POINTS, VP_SMALL_DEFAULT_POINTS } =
      gameDataManager.getGameConstants();

    return this.type === ObjectiveType.Big
      ? VP_BIG_DEFAULT_POINTS
      : VP_SMALL_DEFAULT_POINTS;
  }
}
