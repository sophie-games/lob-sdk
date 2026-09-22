import {
  GameScenarioType,
  LegacyHybridScenario,
  LegacyPresetScenario,
  LegacyRandomScenario,
  Scenario,
} from "@lob-sdk/types";
import { SCENARIO_SCHEMA_VERSION } from "./constants";

/** Any shape the normalizer accepts: current {@link Scenario} or a legacy type. */
export type RawScenarioInput =
  | Scenario
  | LegacyPresetScenario
  | LegacyHybridScenario
  | LegacyRandomScenario;

/**
 * Normalize any scenario input into the current feature-based {@link Scenario}
 * schema. Current-schema scenarios are returned unchanged; legacy shapes are
 * migrated based on their `type` discriminator.
 */
export function normalizeScenario(raw: RawScenarioInput): Scenario {
  if (raw.version !== undefined && raw.version !== SCENARIO_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported scenario schema version ${raw.version}; expected ${SCENARIO_SCHEMA_VERSION}`,
    );
  }
  if (_isCurrent(raw)) return _backfillCurrent(raw);
  switch (raw.type) {
    case GameScenarioType.Preset:
      return _fromPreset(raw);
    case GameScenarioType.Hybrid:
      return _fromHybrid(raw);
    case GameScenarioType.Random:
      return _fromRandom(raw);
    default: {
      const _exhaustive: never = raw;
      throw new Error(`Unknown scenario shape: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

const _backfillCurrent = (raw: Scenario): Scenario => {
  if (raw.placeableObjectives !== undefined) return raw;
  // Random (dynamic-army, instruction-driven) maps get placeable objectives by
  // default. Fixed-roster instruction maps are excluded.
  const placeableObjectives =
    raw.allowDynamicArmy === true && (raw.instructions?.length ?? 0) > 0;
  return { ...raw, placeableObjectives };
};

const _isCurrent = (raw: RawScenarioInput): raw is Scenario =>
  raw.version === SCENARIO_SCHEMA_VERSION;

const _baseFields = (
  raw: LegacyPresetScenario | LegacyHybridScenario | LegacyRandomScenario,
) => ({
  version: SCENARIO_SCHEMA_VERSION,
  name: raw.name,
  description: raw.description,
  ranked: raw.ranked,
  hidden: raw.hidden,
  triggers: raw.triggers,
  conquestVictory: raw.conquestVictory,
  locales: raw.locales,
});

const _fromPreset = (raw: LegacyPresetScenario): Scenario => ({
  ..._baseFields(raw),
  map: raw.map,
  players: raw.players,
  units: raw.units,
  objectives: raw.objectives,
  allowDynamicArmy: false,
  placeableObjectives: false,
});

const _fromHybrid = (raw: LegacyHybridScenario): Scenario => ({
  ..._baseFields(raw),
  map: raw.map,
  units: raw.units ?? [],
  objectives: raw.objectives ?? [],
  allowDynamicArmy: raw.fixedArmy !== true,
  placeableObjectives: false,
});

const _fromRandom = (raw: LegacyRandomScenario): Scenario => ({
  ..._baseFields(raw),
  baseTerrain: raw.baseTerrain,
  instructions: raw.instructions,
  allowDynamicArmy: true,
  placeableObjectives: true,
});
