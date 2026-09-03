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
   * @param gameDataManager - The game data manager to access the objectives game rule
   * @param vpBigDefaultPoints - Optional layered override for the big-objective default
   * @param vpSmallDefaultPoints - Optional layered override for the small-objective default
   * @returns The effective victory points value
   */
  getVictoryPoints(
    gameDataManager: GameDataManager,
    vpBigDefaultPoints?: number,
    vpSmallDefaultPoints?: number,
  ): number {
    if (this._victoryPoints !== undefined) {
      return this._victoryPoints;
    }
    const objectives = gameDataManager.getGameRules().objectives;
    return this.type === ObjectiveType.Big
      ? vpBigDefaultPoints ?? objectives.vpBigDefaultPoints
      : vpSmallDefaultPoints ?? objectives.vpSmallDefaultPoints;
  }
}
