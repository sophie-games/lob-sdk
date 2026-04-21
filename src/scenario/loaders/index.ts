import { Scenario } from "@lob-sdk/types";
import { RawScenarioInput, ScenarioLoader } from "./scenario-loader";
import { LegacyPresetLoader } from "./legacy-preset-loader";
import { LegacyHybridLoader } from "./legacy-hybrid-loader";
import { LegacyRandomLoader } from "./legacy-random-loader";

const LOADERS: ReadonlyArray<ScenarioLoader<RawScenarioInput>> = [
  new LegacyPresetLoader(),
  new LegacyHybridLoader(),
  new LegacyRandomLoader(),
];

function isCurrent(raw: RawScenarioInput): raw is Scenario {
  return typeof raw.version === "number";
}

/**
 * Normalize any scenario input into the new feature-based {@link Scenario} schema.
 * Scenarios already on the current schema are returned unchanged; legacy scenarios
 * are dispatched to the appropriate loader.
 */
export function normalizeScenario(raw: RawScenarioInput): Scenario {
  if (isCurrent(raw)) return raw;
  for (const loader of LOADERS) {
    if (loader.canLoad(raw)) return loader.load(raw);
  }
  throw new Error(
    `No loader can handle scenario "${raw.name}" — unknown legacy shape`,
  );
}

export { ScenarioLoader } from "./scenario-loader";
export type { RawScenarioInput } from "./scenario-loader";
export { LegacyPresetLoader } from "./legacy-preset-loader";
export { LegacyHybridLoader } from "./legacy-hybrid-loader";
export { LegacyRandomLoader } from "./legacy-random-loader";
