import { GameDataManager } from "@lob-sdk/game-data-manager";

const manager = GameDataManager.get("napoleonic");

// The scenario editor offers every category for override, so one no terrain
// uses would accept edits that never reach a battle.
it("uses every napoleonic terrain category on some terrain", () => {
  const used = new Set<string>(
    manager.getTerrains().map((terrain) => manager.getCategoryByTerrain(terrain.id)),
  );

  expect(
    Object.keys(manager.getTerrainCategories()).filter((id) => !used.has(id)),
  ).toEqual([]);
});
