import { TurnSubmission, UnitCounts, GameUserResult } from "@lob-sdk/types";

export enum UserTier {
  Free = "free",
  Bronze = "bronze",
  Silver = "silver",
  Gold = "gold",
}

export interface Player {
  userId: number;
  playerNumber: number;
  username: string;
  elo: number;
  team: number;
  passed: boolean;
  defeated: boolean;
  consecutiveUnplayedTurns: number;
  ticksUnderPressure: number | null;
  userTier: UserTier;
  turnSubmission: TurnSubmission | null;
  wantsDraw: boolean;
  armyComposition: UnitCounts | null;
  unitDamageTaken: UnitCounts | null;
  unitsGained: UnitCounts | null;
  baseAmmoReserve: number;
  ammoReserve: number;
  avatarId?: number;
  discordId?: string;
  discordUsername?: string;
  countryCode?: string;
  /**
   * Current Fischer time bank in seconds. Optional to save network data;
   * omitted if bank time is disabled or not available in the current context.
   */
  currentTimeBankSeconds?: number;
  /**
   * Timestamp when this player submitted their turn (seconds since epoch).
   * Used for Fischer timing. Null if player hasn't submitted.
   */
  submittedAt: number | null;
}

export interface PlayerInfo {
  userId: number;
  username: string;
  playerNumber: number;
  team: number;
  elo: number;
  eloBefore: number | null;
  eloChange: number;
  basicCurrencyEarned: number | null;
  premiumCurrencyEarned: number | null;
  result: GameUserResult | null;
  passed: boolean;
  defeated: boolean;
  consecutiveUnplayedTurns: number;
  ticksUnderPressure: number | null;
  userTier: UserTier;
  avatarId?: number;
  turnSubmission: TurnSubmission | null;
  wantsDraw: boolean;
  unitSkins?: number[];
  discordId?: string;
  discordUsername?: string;
  objectiveSkins?: number[];
  armyComposition: UnitCounts | null;
  unitDamageTaken: UnitCounts | null;
  unitsGained: UnitCounts | null;
  ammoReserve: number;
  baseAmmoReserve: number;
  /**
   * Fischer timing: current remaining time bank. Optional to save network data;
   * omitted if bank time is disabled or not available in the current context.
   */
  currentTimeBankSeconds?: number;
  countryCode?: string;
  /**
   * Timestamp when this player submitted their turn (seconds since epoch).
   * Used for Fischer timing. Null if player hasn't submitted.
   */
  submittedAt: number | null;
}
