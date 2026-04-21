import {
  GameScenarioType,
  HybridScenario,
  Scenario,
} from "@lob-sdk/types";
import { RawScenarioInput, ScenarioLoader } from "./scenario-loader";

export class LegacyHybridLoader extends ScenarioLoader<HybridScenario> {
  canLoad(raw: RawScenarioInput): raw is HybridScenario {
    return raw.type === GameScenarioType.Hybrid;
  }

  load(raw: HybridScenario): Scenario {
    return {
      ...this._baseFields(raw),
      map: raw.map,
      units: raw.units ?? [],
      objectives: raw.objectives ?? [],
      allowDynamicArmy: raw.fixedArmy !== true,
    };
  }
}
