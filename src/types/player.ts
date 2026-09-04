import { TurnSubmission, UnitCounts, GameUserResult } from "@lob-sdk/types";

export enum UserTier {
  Free = "free",
  Bronze = "bronze",
  Silver = "silver",
  Gold = "gold",
}

/** Stable subscription plan identifier, independent from display names and gameplay access. */
export enum SubscriptionPlanId {
  None = "none",
  Plan001 = "plan_001",
  Plan002 = "plan_002",
  Plan003 = "plan_003",
  Plan004 = "plan_004",
}

export enum LostReason {
  Withdrew = 1,
  TimedOut = 2,
  Destroyed = 3,
}

/**
 * Per-battle stats persisted to `game_users.metadata` JSONB. All sub-objects
 * are HP-denominated and keyed by {@link UnitType}.
 */
export interface PlayerBattleMetadata {
  /** Cumulative HP this player lost, keyed by this player's unit type (the victim). */
  damageTaken?: UnitCounts;
  /**
   * Cumulative HP this player recovered via supply / reinforcement, keyed by
   * this player's unit type. Always <= {@link damageTaken} for the same key.
   * Battle reports add this (as `hp / template.hp` unit equivalents) into the
   * strength column.
   */
  damageHealed?: UnitCounts;
  /**
   * HP this player inflicted on enemies, keyed by the enemy (victim) unit type.
   * Broadly symmetric to opposing players' damageTaken, but strictly smaller:
   * damage with no attributed attacker (environmental, shatter) and friendly
   * fire both count as the victim's damageTaken while being credited to nobody.
   */
  damageDealt?: UnitCounts;
  /**
   * HP this player inflicted on enemies, keyed by this player's (attacker)
   * unit type. Useful for analytics like "which of my unit types dealt the
   * most damage" without telling you what type of enemy was on the receiving
   * end.
   */
  damageDealtBy?: UnitCounts;
}

export interface Player {
  userId: number;
  playerNumber: number;
  username: string;
  elo: number;
  /** Ranked games settled for this era's rating in the current season. */
  eloGames?: number;
  team: number;
  passed: boolean;
  defeated: boolean;
  consecutiveUnplayedTurns: number;
  ticksUnderPressure: number | null;
  userTier: UserTier;
  turnSubmission: TurnSubmission | null;
  wantsDraw: boolean;
  armyComposition: UnitCounts | null;
  metadata: PlayerBattleMetadata | null;
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
  /** Short tag of the player's coalition, if any. Public information. */
  clanTag?: string | null;
  playerNumber: number;
  team: number;
  /** Current ELO; null while current-season placements are incomplete. */
  elo: number | null;
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
  metadata: PlayerBattleMetadata | null;
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
  /** Whether this account carries the verified badge. */
  isVerified?: boolean;
  /** Stable subscription plan used to select the player's public badge. */
  subscriptionPlanId?: SubscriptionPlanId;
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
  /**
   * Lobby-picker games only: whether this player has locked in a valid army
   * (their prerequisite for the host to start). Server-computed so a redacted
   * army composition doesn't leak. Always `true` for games without the picker
   * and for started games, where readiness is meaningless — non-optional so no
   * reader has to guess a default for the absent case.
   */
  armyReady: boolean;
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
  metadata: null;
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
