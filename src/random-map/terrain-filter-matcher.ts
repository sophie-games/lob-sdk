import { TerrainFilter, TerrainType } from "@lob-sdk/types";

/**
 * Answers whether a tile satisfies a {@link TerrainFilter}, so an instruction can place a feature
 * relative to ground already drawn: a village within reach of a bridge, a redoubt on a crest.
 *
 * A tile matches when its height lies in one of `heights` (if given) and at least `minAmount`
 * (default 1) tiles of `terrains` lie within `searchRadius` (default 0, the tile itself)
 * 4-connected steps of it (if terrains are given).
 */
export class TerrainFilterMatcher {
  private readonly allowed: Set<TerrainType> | undefined;

  constructor(
    private readonly filter: TerrainFilter,
    private readonly terrains: TerrainType[][],
    private readonly heightMap: number[][],
  ) {
    this.allowed = filter.terrains ? new Set(filter.terrains) : undefined;
  }

  matches(x: number, y: number): boolean {
    return this.heightMatches(x, y) && this.terrainMatches(x, y);
  }

  private heightMatches(x: number, y: number): boolean {
    const { heights } = this.filter;
    if (!heights || heights.length === 0) return true;
    const h = this.heightMap[x][y];
    return heights.some((range) => h >= range.min && h <= range.max);
  }

  private terrainMatches(x: number, y: number): boolean {
    if (!this.allowed) return true;
    const radius = this.filter.searchRadius ?? 0;
    const needed = this.filter.minAmount ?? 1;
    let found = 0;
    // Within `radius` 4-connected steps is the diamond |dx| + |dy| <= radius.
    for (let dx = -radius; dx <= radius; dx++) {
      const reach = radius - Math.abs(dx);
      for (let dy = -reach; dy <= reach; dy++) {
        const terrain = this.terrains[x + dx]?.[y + dy];
        if (terrain !== undefined && this.allowed.has(terrain) && ++found >= needed)
          return true;
      }
    }
    return false;
  }
}
