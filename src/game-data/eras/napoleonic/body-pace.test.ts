import { GameDataManager } from "@lob-sdk/game-data-manager";
import { OrderType } from "../../../types";

describe("Napoleonic body pace", () => {
  const gameDataManager = GameDataManager.get("napoleonic");

  it("lets guns on Fire and Advance or retreating fall behind instead of holding their division", () => {
    expect(gameDataManager.getUnitCategoryTemplate("artillery").ordersExemptFromBodyPace)
      .toEqual([OrderType.FireAndAdvance, OrderType.Fallback]);
  });
});
