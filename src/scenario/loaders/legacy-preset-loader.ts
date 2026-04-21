import {
  GameScenarioType,
  PresetScenario,
  Scenario,
} from "@lob-sdk/types";
import { RawScenarioInput, ScenarioLoader } from "./scenario-loader";

export class LegacyPresetLoader extends ScenarioLoader<PresetScenario> {
  canLoad(raw: RawScenarioInput): raw is PresetScenario {
    return raw.type === GameScenarioType.Preset;
  }

  load(raw: PresetScenario): Scenario {
    return {
      ...this._baseFields(raw),
      map: raw.map,
      players: raw.players,
      units: raw.units,
      objectives: raw.objectives,
      allowDynamicArmy: false,
    };
  }
}
