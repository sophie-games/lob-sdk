import { napoleonicScenarioCatalog } from "@lob-sdk/game-data/eras/napoleonic/scenario-catalog";
import { ww2ScenarioCatalog } from "@lob-sdk/game-data/eras/ww2/scenario-catalog";
import { GameDataManager } from "./game-data-manager";

GameDataManager.registerScenarioCatalog(
  "napoleonic",
  napoleonicScenarioCatalog,
);
GameDataManager.registerScenarioCatalog("ww2", ww2ScenarioCatalog);
