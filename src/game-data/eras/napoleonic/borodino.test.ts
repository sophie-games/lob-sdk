import { GameDataManager } from "@lob-sdk/game-data-manager";
import { TerrainType } from "@lob-sdk/types";

describe("Borodino battlefield map", () => {
  const manager = GameDataManager.get("napoleonic");
  const scenario = manager.getScenario("borodino");
  const map = scenario.map!;
  const tileSize = manager.getGameConstants().TILE_SIZE;
  const tiles = 224;
  const tileOf = (pos: { x: number; y: number }) => ({
    x: Math.floor(pos.x / tileSize),
    y: Math.floor(pos.y / tileSize),
  });
  const at = (pos: { x: number; y: number }) => {
    const { x, y } = tileOf(pos);
    return map.terrains[x]?.[y];
  };
  const label = (name: string) => map.labels?.find(({ text }) => text === name);

  it("uses a fixed 11.2 km frame with matching terrain and relief grids", () => {
    expect(tileSize * manager.getGameConstants().METERS_PER_PIXEL!).toBe(50);
    expect(map.width).toBe(tiles * tileSize);
    expect(map.height).toBe(tiles * tileSize);
    expect(map.terrains).toHaveLength(tiles);
    expect(map.heightMap).toHaveLength(tiles);
    expect(map.terrains.every((column) => column.length === tiles)).toBe(true);
    expect(map.heightMap.every((column) => column.length === tiles)).toBe(true);
  });

  it.each([
    ["Borodino", 99, 90],
    ["Shevardino", 68, 141],
    ["Gorki", 135, 83],
    ["Semenovskoye", 116, 133],
    ["Utitsa", 125, 179],
    ["Great Redoubt", 109, 110],
    ["Middle Fleche", 112, 142],
    ["Maslovo Fleches", 193, 52],
  ])("places %s at its georeferenced landmark", (name, x, y) => {
    const place = label(name);
    expect(place).toBeDefined();
    const tile = tileOf(place!.pos);
    expect(Math.abs(tile.x - x)).toBeLessThanOrEqual(1);
    expect(Math.abs(tile.y - y)).toBeLessThanOrEqual(1);
  });

  it("marks the fieldworks and starts their objectives with the historical holders", () => {
    for (const name of ["Great Redoubt", "Northern Fleche", "Middle Fleche", "Southern Fleche", "Shevardino Redoubt", "Maslovo Fleches"]) {
      const center = tileOf(label(name)!.pos);
      const nearby = [-1, 0, 1].some((dx) =>
        [-1, 0, 1].some((dy) =>
          map.terrains[center.x + dx]?.[center.y + dy] === TerrainType.Redoubt,
        ),
      );
      expect(nearby).toBe(true);
    }
    const owners = Object.fromEntries(
      (scenario.objectives ?? []).map(({ name, player }) => [name, player]),
    );
    expect(owners).toMatchObject({
      "Shevardino Redoubt": 1,
      "Great Redoubt": 2,
      "Bagration Fleches": 2,
      "Utitsa Mound": 2,
    });
    expect(
      (scenario.objectives ?? []).every(
        ({ pos }) => ![TerrainType.DeepWater, TerrainType.City, TerrainType.Cliff].includes(at(pos)!),
      ),
    ).toBe(true);
  });

  it("keeps the road network laterally continuous without diagonal gaps", () => {
    const path = new Set([TerrainType.Road, TerrainType.Dirt, TerrainType.Bridge]);
    let diagonals = 0;
    let pathTiles = 0;
    for (let x = 0; x < tiles; x++) {
      for (let y = 0; y < tiles; y++) {
        if (!path.has(map.terrains[x][y])) continue;
        pathTiles++;
        if (x + 1 >= tiles) continue;
        for (const dy of [-1, 1]) {
          if (y + dy < 0 || y + dy >= tiles) continue;
          if (
            path.has(map.terrains[x + 1][y + dy]) &&
            !path.has(map.terrains[x + 1][y]) &&
            !path.has(map.terrains[x][y + dy])
          ) diagonals++;
        }
      }
    }
    expect(pathTiles).toBeGreaterThan(800);
    expect(diagonals).toBe(0);
  });

  it("retains the 574-unit order of battle on passable ground", () => {
    const units = scenario.units ?? [];
    expect(units).toHaveLength(574);
    expect(units.filter((unit) => unit.player === 1)).toHaveLength(297);
    expect(units.filter((unit) => unit.player === 2)).toHaveLength(277);
    expect(new Set(units.map((unit) => unit.id)).size).toBe(units.length);
    expect(new Set(units.map((unit) => `${unit.pos.x},${unit.pos.y}`)).size).toBe(units.length);
    expect(units.every(({ pos }) => pos.x >= 0 && pos.y >= 0 && pos.x < map.width && pos.y < map.height)).toBe(true);
    expect(units.every(({ pos }) => ![TerrainType.DeepWater, TerrainType.City, TerrainType.Cliff].includes(at(pos)!))).toBe(true);
  });
});
