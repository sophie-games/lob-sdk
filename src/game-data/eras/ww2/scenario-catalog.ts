import type { ScenarioCatalog } from "@lob-sdk/game-data-manager/scenario-catalog";
import battleOfMoscow from "./scenarios/battle-of-moscow.json";
import fields from "./scenarios/fields.json";
import battleOfFrance from "./scenarios/battle-of-france.json";

export const ww2ScenarioCatalog = {
  fields,
  "battle-of-france": battleOfFrance,
  "battle-of-moscow": battleOfMoscow,
} as unknown as ScenarioCatalog;
