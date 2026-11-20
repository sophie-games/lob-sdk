import { GameDataManager } from "@lob-sdk/game-data-manager";
import { RandomMapGenerator } from "../../../random-map/random-map-generator";
import { TerrainType } from "../../../types/terrain";

describe("Hills scenario", () => {
  const gameDataManager = GameDataManager.get("napoleonic");
  const { DEFAULT_BATTLE_TYPE, TILE_SIZE } = gameDataManager.getGameConstants();

  it("wraps its hilltops in woods", () => {
    for (const seed of [1, 2, 3, 42, 777]) {
      const { map } = new RandomMapGenerator().generate({
        scenario: gameDataManager.getScenario("hills"),
        dynamicBattleType: DEFAULT_BATTLE_TYPE,
        maxPlayers: 2,
        seed,
        tileSize: TILE_SIZE,
        era: "napoleonic",
      });
      const tiles = map.terrains.flat();
      const forest = tiles.filter((t) => t === TerrainType.Forest).length;
      expect(forest / tiles.length).toBeGreaterThan(0.15);
    }
  });
});
