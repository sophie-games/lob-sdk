import { Size } from "@lob-sdk/types";
import { getMapSize } from "./map-size";
import { GameDataManager } from "@lob-sdk/game-data-manager";

describe("getMapSize", () => {
  const gameDataManager = GameDataManager.get("napoleonic");
  const { TILE_SIZE } = gameDataManager.getGameConstants();

  [Size.Small, Size.Medium, Size.Large].forEach((size) => {
    it(`returns width and height as multiples of TILE_SIZE for ${size}`, () => {
      const { width, height } = getMapSize(size);

      expect(width % TILE_SIZE).toBe(0);
      expect(height % TILE_SIZE).toBe(0);
    });
  });
});
