import type { GameEra } from "../game-data-manager/types";

export type GameTipEvent =
  | "ready"
  | "stateUpdated"
  | "unitSelected"
  | "orderTypeChanged"
  | "orderPlaced"
  | "autofireChanged"
  | "shootAttempted";

/**
 * Tactical situations the client evaluates against the visible battlefield.
 * Each one names a predicate in `client/src/game/tips/situations.ts`.
 */
export type GameSituationKey =
  | "skirmisherThreatenedByArtillery"
  | "skirmisherThreatenedByCavalry"
  | "skirmisherThreatenedByInfantry"
  | "infantryThreatenedByCavalryFrontal"
  | "infantryThreatenedByCavalryFlank"
  | "infantryShouldFormLineVsCavalryFrontal"
  | "infantryShouldFormLineAny"
  | "cavalryShouldFallbackFromInfantry"
  | "artilleryCanFireAndAdvance"
  | "artilleryCanRotateToFire"
  | "infantryReadyForLine"
  | "cavalryVsWeakerCavalry"
  | "cavalryVsEqualCavalry"
  | "cavalryVsStrongerCavalry"
  | "enemyInfantrySquare"
  | "cavalryVsInfantryFlank"
  | "cavalryVsShakenInfantry"
  | "cavalryVsSkirmishers"
  | "cavalryVsArtillery"
  | "cavalryShouldPursueRouter"
  | "dominatingShouldPushObjective"
  | "losingShouldFallbackToObjective"
  | "infantryFirefightRange"
  | "infantryBayonetCharge"
  | "infantryFallback"
  | "infantryVsSkirmishers"
  | "infantryVsArtillery"
  | "infantryColumnMarch"
  | "hasIdleUnit";

export type GameTipCondition =
  | { kind: "runningVulnerability" }
  | { kind: "allyOverlap" }
  | { kind: "terrainModifiers" }
  | { kind: "ammoReserve"; maxRatio: number }
  | { kind: "organization"; maxRatio: number }
  | { kind: "maxAutofire" }
  | { kind: "exposedFlank" }
  | { kind: "chargeOrder" }
  | { kind: "ammoObjective" }
  | { kind: "victoryPoints"; maxRatioFromAverage: number }
  | { kind: "blockedShot"; categories: readonly string[] }
  | { kind: "always" }
  | {
      kind: "situation";
      situation: GameSituationKey;
      /** Point the lesson at an objective of this allegiance instead of the matched unit. */
      targetObjective?: "neutral" | "friendly" | "enemy";
    };

export type GameTipAction =
  | "unit"
  | "objective"
  | "ammoReserve"
  | "battleOverview";

/** Serializable content: mechanics are named predicates, never executable scripts. */
export interface GameTipDefinition {
  /** Stable preference key; changing it makes this a new lesson. */
  id: string;
  enabled?: boolean;
  /** Omit to share a lesson across eras. */
  eras?: readonly GameEra[];
  battleOnly: boolean;
  on: readonly GameTipEvent[];
  condition: GameTipCondition;
  /**
   * How many separate battles may show this lesson before it goes quiet.
   * Default 1. Tactical lessons repeat a few times because one sighting
   * teaches little.
   */
  maxShows?: number;
  titleKey: string;
  descriptionKey: string;
  action?: { type: GameTipAction; labelKey: string };
}
