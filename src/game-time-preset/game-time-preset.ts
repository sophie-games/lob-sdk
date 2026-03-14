/** Seconds per minute. */
export const SECONDS_PER_MINUTE = 60;
/** Seconds per hour. */
export const SECONDS_PER_HOUR = 3600;
/** Seconds to be considered slow. */
export const SECONDS_TO_BE_SLOW = 7200; // 2 hours
/** Seconds per day (24 × 3600). */
export const SECONDS_PER_DAY = 86400;
/** Seconds per year (365 × 24 × 3600). Used as threshold for "no timing" / unlimited (e.g. offline). */
export const SECONDS_PER_YEAR = 31536000;

/** Game time preset IDs — config is the source of truth in @common/game-time-presets */
export type GameTimePresetId =
  | "bullet"
  | "blitz"
  | "rapid"
  | "daily"
  | "correspondence"
  | "marathon"
  | "offline"
  | "custom";

/**
 * Classifies game time controls by typical pace.
 * @see getGameSpeed
 */
export enum GameSpeed {
  /** Short time controls (e.g. bank or turn cap under 1 day). */
  Fast = "fast",
  /** Long time controls (e.g. daily, correspondence; bank or turn cap ≥ 1 day). */
  Slow = "slow",
}

/**
 * Derives the game speed from bank and turn-cap times.
 * A game is **slow** when bankTimeSeconds >= 1 day OR turnCapSeconds >= 1 day.
 * Otherwise it is **fast**.
 */
export const getGameSpeed = (
  bankTimeSeconds: number,
  turnCapSeconds: number,
): GameSpeed =>
  bankTimeSeconds >= SECONDS_TO_BE_SLOW || turnCapSeconds >= SECONDS_TO_BE_SLOW
    ? GameSpeed.Slow
    : GameSpeed.Fast;

/**
 * Game time presets use a Fischer timing system with three control parameters:
 *
 *  - **bankTimeSeconds** – each player's time bank. Players start with this much
 *    time and it also acts as the bank ceiling (increments cannot push the bank
 *    above this value).
 *
 *  - **incrementSeconds** – seconds added to a player's bank after they submit
 *    their turn. `0` means no increment (pure time-bank mode).
 *
 *  - **turnCapSeconds** – a per-turn wall-clock ceiling for fast games, preventing
 *    a player with a large bank from taking an extremely long single turn.
 *    `0` means no cap (used by daily/correspondence presets).
 */
export interface GameTimePreset {
  id: GameTimePresetId;
  /** Starting bank per player; also the maximum the bank can reach after increments. */
  bankTimeSeconds: number;
  /** Seconds added to the bank after each submitted turn. 0 = no increment. */
  incrementSeconds: number;
  /** Per-turn wall-clock cap. 0 = no cap (daily presets). */
  turnCapSeconds: number;
  /**
   * Optional turn cap for the deployment turn (turn 0). If defined,
   * Fischer timing is bypassed for that turn. 0 = not set.
   */
  deploymentTimeSeconds: number;
  /** Whether the preset is intended for offline use only (e.g. replays) and should be hidden from selection menus. */
  isOffline?: boolean;
}

export const OFFLINE_TIME_SETTINGS: GameTimePreset = {
  id: "offline",
  bankTimeSeconds: Number.MAX_SAFE_INTEGER,
  incrementSeconds: 0,
  turnCapSeconds: 0,
  deploymentTimeSeconds: 0,
};

export class GameTimePresetManager {
  private static _instance: GameTimePresetManager | null = null;
  private _presets: Map<GameTimePresetId, GameTimePreset> = new Map();

  public static readonly DEFAULT_PRESET_ID: GameTimePresetId = "blitz";
  public static readonly DEFAULT_FAST_PRESET_IDS: GameTimePresetId[] = [
    "bullet",
  ];
  public static readonly DEFAULT_SLOW_PRESET_IDS: GameTimePresetId[] = [
    "daily",
  ];
  /** Preset ID for offline/replay use (no time limit); hidden from selection. */
  public static readonly OFFLINE_PRESET_ID: GameTimePresetId = "offline";
  /** Preset ID used when game was created with custom time values (not a named preset). */
  public static readonly CUSTOM_PRESET_ID: GameTimePresetId = "custom";
  /** Preset IDs that are not shown in time-preset selection (e.g. create custom game). */
  public static readonly HIDDEN_FROM_SELECTION_IDS: readonly GameTimePresetId[] =
    [
      GameTimePresetManager.OFFLINE_PRESET_ID,
      GameTimePresetManager.CUSTOM_PRESET_ID,
    ];

  private constructor() {
    // These presets were made with the assumption that avg game time is 20 turns, and thr first 5 turns will usually 1/4 the time of a normal turn
    // Turn cap is generally limited to 2x the expected avg turn length to prevent stalling
    const presets: GameTimePreset[] = [
      {
        // Est game time ~25 min + 2 deployment
        id: "bullet",
        bankTimeSeconds: 60 * 20 * 1, // 1 min turns
        incrementSeconds: 20, // results in extra ~6 mins
        turnCapSeconds: 60 * 2, // 2 min
        deploymentTimeSeconds: 120,
      },
      {
        // Est game time ~45 min + 3 deployment
        id: "blitz",
        bankTimeSeconds: 60 * 20 * 1.5, // 1.5 min turns
        incrementSeconds: 40, // results in extra ~13 mins
        turnCapSeconds: 60 * 4, // 4 min
        deploymentTimeSeconds: 60 * 3,
      },
      {
        // Est game time ~1 hour 15 min + 5 deployment
        id: "rapid",
        bankTimeSeconds: 60 * 20 * 2.5, // 2.5 min turns
        incrementSeconds: 60, // results in extra ~20 mins
        turnCapSeconds: 60 * 5, // 5 min
        deploymentTimeSeconds: 60 * 5,
      },

      {
        // TODO: rename to slow
        id: "daily",
        bankTimeSeconds: 60 * 60 * 4, // 4 hours
        incrementSeconds: 60 * 5, // 5 min
        turnCapSeconds: 0,
        deploymentTimeSeconds: 0,
      },
      {
        id: "correspondence", // TODO rename to something else
        bankTimeSeconds: 60 * 60 * 24 * 3, // 24 hours
        incrementSeconds: 60 * 60 * 24 * 0.5, // 12 hours
        turnCapSeconds: 0,
        deploymentTimeSeconds: 0,
      },
      {
        id: "marathon", // TODO rename to daily
        bankTimeSeconds: 60 * 60 * 24 * 7, // 3 days
        incrementSeconds: 60 * 60 * 24 * 1, // 1 days
        turnCapSeconds: 0,
        deploymentTimeSeconds: 0,
      },
      {
        id: GameTimePresetManager.OFFLINE_PRESET_ID,
        bankTimeSeconds: Number.MAX_SAFE_INTEGER,
        incrementSeconds: 0,
        turnCapSeconds: 0,
        deploymentTimeSeconds: 0,
        isOffline: true,
      },
    ];

    presets.forEach((p) => this._presets.set(p.id, p));
  }

  public static getInstance(): GameTimePresetManager {
    if (!this._instance) {
      this._instance = new GameTimePresetManager();
    }
    return this._instance;
  }

  public get(id: GameTimePresetId): GameTimePreset {
    return this._presets.get(id)!;
  }

  public tryGet(id: GameTimePresetId): GameTimePreset | null {
    return this._presets.get(id) ?? null;
  }

  public getPresetIds(): GameTimePresetId[] {
    return Array.from(this._presets.keys());
  }

  /** Preset IDs that are available in time-preset selection (excludes offline, custom, etc.). */
  public getSelectablePresetIds(): GameTimePresetId[] {
    return this.getPresetIds().filter(
      (id) => !GameTimePresetManager.HIDDEN_FROM_SELECTION_IDS.includes(id),
    );
  }

  public getFastPresets(): GameTimePresetId[] {
    const result: GameTimePresetId[] = [];
    for (const [id, preset] of this._presets.entries()) {
      if (
        getGameSpeed(preset.bankTimeSeconds, preset.turnCapSeconds) ===
          GameSpeed.Fast &&
        !preset.isOffline
      ) {
        result.push(id);
      }
    }
    return result;
  }

  public getSlowPresets(): GameTimePresetId[] {
    const result: GameTimePresetId[] = [];
    for (const [id, preset] of this._presets.entries()) {
      if (
        getGameSpeed(preset.bankTimeSeconds, preset.turnCapSeconds) ===
          GameSpeed.Slow &&
        !preset.isOffline
      ) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Returns the per-turn hard limit in seconds for a preset.
   */
  public getPresetTurnDurationSeconds(id: GameTimePresetId): number {
    const preset = this.get(id);
    return preset.turnCapSeconds || preset.bankTimeSeconds;
  }

  public calculateTimeRemaining(
    id: GameTimePresetId | null | undefined,
    turnStartedTime: number | null | undefined,
    nowSeconds: number,
  ): number {
    if (!id || turnStartedTime === null || turnStartedTime === undefined) {
      return Infinity;
    }

    try {
      const limit = this.getPresetTurnDurationSeconds(id);
      return turnStartedTime + limit - nowSeconds;
    } catch (e) {
      return Infinity;
    }
  }

  /**
   * Returns whether a turn is past its time limit (rancid) given an explicit limit.
   * Use this when the limit comes from the DB (e.g. custom games) rather than a preset id.
   */
  public isRancidWithLimit(
    turnStartedTime: number | null | undefined,
    limitSeconds: number,
    nowSeconds: number,
    marginSeconds: number,
  ): boolean {
    if (turnStartedTime === null || turnStartedTime === undefined) {
      return false;
    }
    return turnStartedTime + limitSeconds + marginSeconds < nowSeconds;
  }

  public isRancid(
    id: GameTimePresetId | null | undefined,
    turnStartedTime: number | null | undefined,
    nowSeconds: number,
    marginSeconds: number,
  ): boolean {
    if (!id || turnStartedTime === null || turnStartedTime === undefined) {
      return false;
    }

    try {
      const limit = this.getPresetTurnDurationSeconds(id);
      return this.isRancidWithLimit(
        turnStartedTime,
        limit,
        nowSeconds,
        marginSeconds,
      );
    } catch (e) {
      return false;
    }
  }

  public orderActiveGames<
    T extends { passed: boolean; started: boolean; timeRemaining: number },
  >(games: T[]): T[] {
    return games.sort((a, b) => {
      if (a.passed !== b.passed) return a.passed ? 1 : -1;
      if (a.started !== b.started) return a.started ? -1 : 1;
      return a.timeRemaining - b.timeRemaining;
    });
  }
}

/** Converts seconds to a compact, human-readable label for preset cards. */
export const formatPresetTime = (seconds: number): string => {
  if (seconds % SECONDS_PER_DAY === 0) {
    const days = seconds / SECONDS_PER_DAY;
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (seconds % SECONDS_PER_HOUR === 0) {
    const hours = seconds / SECONDS_PER_HOUR;
    return `${hours}h`;
  }
  if (seconds % SECONDS_PER_MINUTE === 0) {
    return `${seconds / SECONDS_PER_MINUTE} min`;
  }
  return `${seconds}s`;
};
