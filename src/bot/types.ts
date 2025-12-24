import { IServerGame, TurnSubmission, UnitCategoryId } from "@lob-sdk/types";

/**
 * A synchronous bot play script function.
 */
type OnBotPlayScriptSync = (
  game: IServerGame,
  playerNumber: number
) => TurnSubmission;

/**
 * An asynchronous bot play script function.
 */
type OnBotPlayScriptAsync = (
  game: IServerGame,
  playerNumber: number
) => Promise<TurnSubmission>;

/**
 * A bot play script that can be either synchronous or asynchronous.
 */
export type OnBotPlayScript = OnBotPlayScriptSync | OnBotPlayScriptAsync;

/**
 * A string identifier for bot unit categories (e.g., "Infantry", "Cavalry", "Artillery").
 */
export type BotUnitCategory = string;

/**
 * Configuration for bot behavior, including category groupings, group sizes, and strategies.
 */
export interface BotConfig {
  /** Maps unit category IDs to bot unit categories. */
  categoryGroups: Record<UnitCategoryId, BotUnitCategory>;
  /** Maximum number of units per group for each bot category. */
  maxGroupSize: Record<BotUnitCategory, number>;
  /** Strategy configuration for each bot category. */
  strategies: Record<BotUnitCategory, UnitStrategy>;
  /** Threshold values for bot decision-making. */
  thresholds: {
    /** Organization threshold for charging. */
    orgChargeThreshold: number;
  };
}

/**
 * Strategy configuration for a unit category.
 */
export interface UnitStrategy {
  /** The behavior type (e.g., "balanced", "flanking", "support"). */
  behavior: string;
  /** Whether to prefer fire and advance orders. */
  preferFireAndAdvance?: boolean;
  /** Organization threshold for charging. */
  chargeThreshold?: number;
  /** Group cohesion distance multiplier. */
  groupCohesion: number;
  /** Whether to prefer running over walking. */
  preferRun?: boolean;
  /** Whether to avoid artillery units. */
  avoidArtillery?: boolean;
  /** Whether to maintain distance from enemies. */
  maintainDistance?: boolean;
  /** Minimum distance to maintain from enemies (in tiles). */
  minDistanceFromEnemies?: number;
}

/**
 * Interface for bot implementations that can control units in the game.
 */
export interface IBot {
  /**
   * Executes the bot's turn, generating orders for all controlled units.
   * @returns A promise that resolves to the turn submission with orders.
   */
  play(): Promise<TurnSubmission>;
  /**
   * Sets a custom bot play script that overrides the default bot behavior.
   * @param onBotPlayScript - The custom script function.
   * @param scriptName - Optional name for the script.
   */
  setOnBotPlayScript(
    onBotPlayScript: OnBotPlayScript,
    scriptName?: string
  ): void;
  /**
   * Gets the name of the currently set bot script, if any.
   * @returns The script name, or null if no custom script is set.
   */
  getScriptName(): string | null;
  /**
   * Gets the player number this bot controls.
   * @returns The player number.
   */
  getPlayerNumber(): number;
  /**
   * Gets the team number this bot belongs to.
   * @returns The team number.
   */
  getTeam(): number;
}
