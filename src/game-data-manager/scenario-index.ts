import type { GameLocales, ScenarioName } from "@lob-sdk/types";

export type ScenarioMapSize =
  | { width: number; height: number }
  | { tilesX: number; tilesY: number }
  | null;

/** Lightweight scenario fields safe to keep on the application boot path. */
export interface ScenarioMeta {
  name: string;
  description: string;
  locales?: GameLocales;
  ranked: boolean;
  hidden: boolean;
  playerCount: number | null;
  mapSize: ScenarioMapSize;
}

export type ScenarioIndex = Record<ScenarioName, ScenarioMeta>;
