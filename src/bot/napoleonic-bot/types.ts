import { AnyOrder, IServerGame, UnitFormationChange, TerrainCategoryType } from "@lob-sdk/types";
import { BaseUnit } from "@lob-sdk/unit";
import { Vector2 } from "@lob-sdk/vector";
import { IBot } from "../types";
import { GameDataManager } from "@lob-sdk/game-data-manager";

/**
 * Interface for Napoleonic unit strategies.
 * Strategies are now responsible for assigning actual orders to a group of units.
 */
export interface NapoleonicBotStrategyContext {
  /** The current server game state. */
  game: IServerGame;
  /** List of enemy units currently visible to the bot. */
  visibleEnemies: BaseUnit[];
  /** List of bot's units. */
  myUnits: BaseUnit[];
  /** List of all allied units. */
  allyUnits: BaseUnit[];
  /** Array to accumulate the orders being assigned by the strategy. */
  orders: AnyOrder[];
  /** Array to accumulate formation changes being assigned. */
  formationChanges: UnitFormationChange[];
  /** The geometric center of the unit group's formation. */
  formationCenter: Vector2;
  /** The forward-facing direction of the formation. */
  direction: Vector2;
  /** The perpendicular direction to the formation's orientation (right-hand). */
  perpendicular: Vector2;
  /** The total width of the main body of the formation. */
  mainBodyWidth: number;
  /** The angle (in radians) the formation is facing. */
  forwardAngle: number;
  /** Whether the bot is currently in a retreat state. */
  isRetreating: boolean;
  /** Position of the nearest enemy-held objective, if any. */
  closestEnemyObjectivePos: Vector2 | null;
}

/**
 * Defines terrain preferences for a unit group.
 */
export interface TerrainPreference {
  /**
   * If true, the unit will prefer high ground.
   * If false, elevation is ignored.
   */
  preferHighGround: boolean;

  /**
   * Map of categories to their priority (lower is better, e.g. 1 is highest priority).
   */
  categoryPriority: Partial<Record<TerrainCategoryType, number>>;
}

export interface NapoleonicBotStrategy {
  assignOrders(
    units: BaseUnit[],
    context: NapoleonicBotStrategyContext,
  ): void;

  /**
   * Gets the terrain preference for this strategy's unit group.
   */
  getTerrainPreference(): TerrainPreference;
}

/**
 * Interface for the Napoleonic bot to avoid circular dependencies.
 */
export interface INapoleonicBot extends IBot {
  /**
   * Gets the high-level group name for a given unit category.
   * @param categoryId - The unit category ID.
   * @returns The group name (e.g., "infantry", "cavalry").
   */
  getGroup(categoryId: string): string;

  /**
   * Gets the game data manager instance.
   */
  getGameDataManager(): GameDataManager;
}
