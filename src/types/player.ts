import { TurnSubmission, UnitCounts, GameUserResult } from "@lob-sdk/types";

export enum UserTier {
  Free = "free",
  Bronze = "bronze",
  Silver = "silver",
  Gold = "gold",
}

export enum LostReason {
  Withdrew = 1,
  TimedOut = 2,
  Destroyed = 3,
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
  /**
   * Precomputed army power for VP rules when {@link armyComposition} is withheld
   * from this client (e.g. enemy during an ongoing match). Omitted or null when
   * full unit counts are present.
   */
  vpBaseArmyPower?: number | null;
  baseAmmoReserve: number;
  ammoReserve: number;
  avatarId?: number;
  discordId?: string;
  discordUsername?: string;
  countryCode?: string;
  /**
   * Current Fischer time bank in seconds.
   */
  currentTimeBankSeconds: number;
  /**
   * Timestamp when this player submitted their turn (seconds since epoch).
   * Used for Fischer timing. Null if player hasn't submitted.
   */
  submittedAt: number | null;
  /**
   * Timestamp when this player exited the game (seconds since epoch).
   * Null while the player is still in. Always non-null when {@link defeated} is true.
   */
  lostAt: number | null;
  /**
   * Reason this player exited the game. Null while the player is still in.
   * Always non-null when {@link lostAt} is non-null.
   */
  lostReason: LostReason | null;
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
  /**
   * Precomputed army power for VP rules when {@link armyComposition} is withheld
   * from this client (e.g. enemy during an ongoing match). Omitted or null when
   * full unit counts are present.
   */
  vpBaseArmyPower?: number | null;
  ammoReserve: number;
  baseAmmoReserve: number;
  /**
   * Fischer timing: current remaining time bank.
   */
  currentTimeBankSeconds: number;
  countryCode?: string;
  /**
   * Timestamp when this player submitted their turn (seconds since epoch).
   * Used for Fischer timing. Null if player hasn't submitted.
   */
  submittedAt: number | null;
  /**
   * Timestamp when this player exited the game (seconds since epoch).
   * Null while the player is still in.
   */
  lostAt: number | null;
  /**
   * Reason this player exited the game. Null while the player is still in.
   */
  lostReason: LostReason | null;
}

/**
 * Each {@link PlayerInfo} in {@link GameData.players} for a live client is expected
 * to match one of these branches (ally / finished = full counts; hidden opponent = redacted).
 * This union documents that contract for type narrowing; not every `PlayerInfo` in the
 * codebase satisfies it (e.g. pre-redaction server rows).
 */
export type PlayerInfoRedactedBattleIntel = PlayerInfo & {
  armyComposition: null;
  unitsGained: null;
  unitDamageTaken: null;
  vpBaseArmyPower: number;
};

export type PlayerInfoFullBattleIntel = PlayerInfo & {
  armyComposition: UnitCounts;
};

export type PlayerInfoForGameDataViewer =
  | PlayerInfoFullBattleIntel
  | PlayerInfoRedactedBattleIntel;

/**
 * Narrows to {@link PlayerInfoRedactedBattleIntel} for battle-report UI and similar.
 * Stricter than `vpBaseArmyPower != null` alone: requires withheld counts to match redaction.
 */
export function isPlayerInfoRedactedBattleIntel(
  player: PlayerInfo,
  options: { finished: boolean },
): player is PlayerInfoRedactedBattleIntel {
  return (
    !options.finished &&
    player.armyComposition === null &&
    player.vpBaseArmyPower != null
  );
}
