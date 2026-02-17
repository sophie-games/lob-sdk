import { IServerGame, TurnSubmission } from "@lob-sdk/types";

/**
 * A synchronous bot play script function.
 */
type OnBotPlayScriptSync = (
  game: IServerGame,
  playerNumber: number,
) => TurnSubmission;

/**
 * An asynchronous bot play script function.
 */
type OnBotPlayScriptAsync = (
  game: IServerGame,
  playerNumber: number,
) => Promise<TurnSubmission>;

/**
 * A bot play script that can be either synchronous or asynchronous.
 */
export type OnBotPlayScript = OnBotPlayScriptSync | OnBotPlayScriptAsync;

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
    scriptName?: string,
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
