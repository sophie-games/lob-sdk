import { MAX_MAP_TILES, validateScenarioMapSize } from "./map-size";

const TILE = 16;
const map = (tilesX: number, tilesY: number) => ({
  width: tilesX * TILE,
  height: tilesY * TILE,
  terrains: Array.from({ length: tilesX }, () => Array<number>(tilesY).fill(0)),
});

describe("validateScenarioMapSize", () => {
  it("accepts a map at the limit", () => {
    expect(validateScenarioMapSize(map(MAX_MAP_TILES, MAX_MAP_TILES), TILE)).toBeNull();
  });

  it("rejects a map wider or taller than the limit", () => {
    expect(validateScenarioMapSize(map(MAX_MAP_TILES + 1, 10), TILE)).not.toBeNull();
    expect(validateScenarioMapSize(map(10, MAX_MAP_TILES + 1), TILE)).not.toBeNull();
  });

  it("rejects a terrain grid larger than the size it declares", () => {
    const small = map(10, 10);
    small.terrains = map(MAX_MAP_TILES + 1, 10).terrains;
    expect(validateScenarioMapSize(small, TILE)).not.toBeNull();
  });
});
