import type { RawScenarioInput } from "@lob-sdk/scenario";
import type { ScenarioName } from "@lob-sdk/types";

export type ScenarioCatalog = Record<ScenarioName, RawScenarioInput>;
