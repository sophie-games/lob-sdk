/** Largest map side, in tiles, the game supports. */
export const MAX_MAP_TILES = 512;

interface MapDimensions {
  width: number;
  height: number;
  terrains: readonly (readonly unknown[])[];
}

/** Why the map is too large to play, or null. Checks both the declared size and the grid. */
export function validateScenarioMapSize(map: MapDimensions, tileSize: number): string | null {
  const tilesX = Math.max(Math.ceil(map.width / tileSize), map.terrains.length);
  const tilesY = Math.max(Math.ceil(map.height / tileSize), map.terrains[0]?.length ?? 0);
  if (tilesX > MAX_MAP_TILES || tilesY > MAX_MAP_TILES) {
    return `Map is ${tilesX}x${tilesY} tiles; the maximum is ${MAX_MAP_TILES}x${MAX_MAP_TILES}`;
  }
  return null;
}
