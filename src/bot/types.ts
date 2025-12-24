import { IServerGame, TurnSubmission, UnitCategoryId } from "@lob-sdk/types";

type OnBotPlayScriptSync = (
  game: IServerGame,
  playerNumber: number
) => TurnSubmission;

type OnBotPlayScriptAsync = (
  game: IServerGame,
  playerNumber: number
) => Promise<TurnSubmission>;

export type OnBotPlayScript = OnBotPlayScriptSync | OnBotPlayScriptAsync;

export type BotUnitCategory = string;

export interface BotConfig {
  categoryGroups: Record<UnitCategoryId, BotUnitCategory>;
  maxGroupSize: Record<BotUnitCategory, number>;
  strategies: Record<BotUnitCategory, UnitStrategy>;
  thresholds: {
    orgChargeThreshold: number;
  };
}

export interface UnitStrategy {
  behavior: string;
  preferFireAndAdvance?: boolean;
  chargeThreshold?: number;
  groupCohesion: number;
  preferRun?: boolean;
  avoidArtillery?: boolean;
  maintainDistance?: boolean;
  minDistanceFromEnemies?: number;
}

export interface IBot {
  play(): Promise<TurnSubmission>;
  setOnBotPlayScript(
    onBotPlayScript: OnBotPlayScript,
    scriptName?: string
  ): void;
  getScriptName(): string | null;
  getPlayerNumber(): number;
  getTeam(): number;
}
