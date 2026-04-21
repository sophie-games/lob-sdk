import {
  Scenario,
  PresetScenario,
  HybridScenario,
  RandomScenario,
  SCENARIO_SCHEMA_VERSION,
} from "@lob-sdk/types";

/**
 * Any shape the normalizer accepts at runtime: the new feature-based
 * {@link Scenario}, or any of the legacy discriminated scenario types.
 */
export type RawScenarioInput =
  | Scenario
  | PresetScenario
  | HybridScenario
  | RandomScenario;

type BaseScenarioFields = Pick<
  Scenario,
  | "version"
  | "name"
  | "description"
  | "ranked"
  | "hidden"
  | "triggers"
  | "conquestVictory"
  | "locales"
>;

/**
 * Base class for scenario loaders. Each legacy type has its own subclass
 * that knows how to detect and convert its raw shape into the new
 * {@link Scenario} schema.
 */
export abstract class ScenarioLoader<T extends RawScenarioInput> {
  abstract canLoad(raw: RawScenarioInput): raw is T;
  abstract load(raw: T): Scenario;

  protected _baseFields(
    raw: PresetScenario | HybridScenario | RandomScenario,
  ): BaseScenarioFields {
    return {
      version: SCENARIO_SCHEMA_VERSION,
      name: raw.name,
      description: raw.description,
      ranked: raw.ranked,
      hidden: raw.hidden,
      triggers: raw.triggers,
      conquestVictory: raw.conquestVictory,
      locales: raw.locales,
    };
  }
}
