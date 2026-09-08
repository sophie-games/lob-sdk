import type { GameEra } from "../game-data-manager/types";

export type GameTipEvent =
  | "ready"
  | "stateUpdated"
  | "unitSelected"
  | "orderTypeChanged"
  | "orderPlaced"
  | "autofireChanged"
  | "shootAttempted";

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
  | { kind: "blockedShot"; categories: readonly string[] };

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
  titleKey: string;
  descriptionKey: string;
  action?: { type: GameTipAction; labelKey: string };
}
