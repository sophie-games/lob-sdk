import { TerrainType } from "@lob-sdk/types";

/**
 * Forces a map's `terrains` and `heightMap` grids to be rectangular and exactly
 * `tilesX * tilesY`, deep-copying in the process.
 *
 * Malformed scenarios can carry grids whose dimensions disagree (e.g. an editor
 * resize that grew `terrains` but left `heightMap` a few columns short). Many
 * consumers index the grids raw (`grid[x][y]`) with bounds derived only from
 * `terrains`, so a short `heightMap` throws `undefined[y]` and crashes the turn
 * simulation (fog-of-war line-of-sight), bot formation scoring, and rendering.
 * Repairing at map build time upholds the rectangular invariant the rest of the
 * codebase assumes. Missing terrain tiles fill with `baseTerrain`; missing
 * heights fill with 0 (matching the client ground generator's own fallback).
 */
export function normalizeMapGrids(
  terrains: TerrainType[][],
  heightMap: number[][],
  tilesX: number,
  tilesY: number,
  baseTerrain: TerrainType,
): { terrains: TerrainType[][]; heightMap: number[][]; repaired: boolean } {
  const repaired =
    !isRectangular(terrains, tilesX, tilesY) ||
    !isRectangular(heightMap, tilesX, tilesY);

  const fixedTerrains: TerrainType[][] = new Array(tilesX);
  const fixedHeightMap: number[][] = new Array(tilesX);

  for (let x = 0; x < tilesX; x++) {
    const terrainColumn = terrains[x];
    const heightColumn = heightMap[x];
    const newTerrainColumn: TerrainType[] = new Array(tilesY);
    const newHeightColumn: number[] = new Array(tilesY);

    for (let y = 0; y < tilesY; y++) {
      newTerrainColumn[y] = terrainColumn?.[y] ?? baseTerrain;
      newHeightColumn[y] = heightColumn?.[y] ?? 0;
    }

    fixedTerrains[x] = newTerrainColumn;
    fixedHeightMap[x] = newHeightColumn;
  }

  return { terrains: fixedTerrains, heightMap: fixedHeightMap, repaired };
}

function isRectangular(
  grid: unknown[][],
  tilesX: number,
  tilesY: number,
): boolean {
  if (grid.length !== tilesX) return false;
  for (let x = 0; x < tilesX; x++) {
    if (grid[x]?.length !== tilesY) return false;
  }
  return true;
}
