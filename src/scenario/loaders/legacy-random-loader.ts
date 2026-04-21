import {
  GameScenarioType,
  RandomScenario,
  Scenario,
} from "@lob-sdk/types";
import { RawScenarioInput, ScenarioLoader } from "./scenario-loader";

export class LegacyRandomLoader extends ScenarioLoader<RandomScenario> {
  canLoad(raw: RawScenarioInput): raw is RandomScenario {
    return raw.type === GameScenarioType.Random;
  }

  load(raw: RandomScenario): Scenario {
    return {
      ...this._baseFields(raw),
      baseTerrain: raw.baseTerrain,
      instructions: raw.instructions,
      randomDeploymentZones: raw.defaultDeploymentZones,
      scaledDeploymentZones: raw.scaledDeploymentZones,
      allowDynamicArmy: true,
    };
  }
}
