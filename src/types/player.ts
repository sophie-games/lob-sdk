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
  unitSkins: number[];
  discordId?: string;
  discordUsername?: string;
  objectiveSkins: number[];
  armyComposition: UnitCounts | null;
  unitDamageTaken: UnitCounts | null;
  unitsGained: UnitCounts | null;
  ammoReserve: number;
  baseAmmoReserve: number;
}
