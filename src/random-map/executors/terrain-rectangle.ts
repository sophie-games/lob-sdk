import {
  Scenario,
  InstructionTerrainRectangle,
  TerrainType,
} from "@lob-sdk/types";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";
import { getPosition } from "../utils";
import { TerrainFilterMatcher } from "../terrain-filter-matcher";

/** Places a `skipBlocked` scatter may try per rectangle before giving up on it. */
const MAX_TRIES = 20;

export class TerrainRectangleExecutor {
  private random: () => number;

  constructor(
    private instruction: InstructionTerrainRectangle,
    private scenario: Scenario,
    private seed: number,
    private index: number,
    private terrains: TerrainType[][],
    private heightMap: number[][]
  ) {
    this.random = randomSeeded(deriveSeed(seed, index + 1));
  }

  execute() {
    const { random } = this;
    const { scatter, width, height } = this.instruction;

    const tilesX = this.terrains.length;
    const tilesY = this.terrains[0].length;

    if (this.instruction.terrainFilter) {
      this.executeFiltered();
      return;
    }

    // Support scatter property for random placement
    if (scatter) {
      let count: number;
      if (scatter.count !== undefined) {
        count = scatter.count;
      } else if (scatter.countPer100x100 !== undefined) {
        count = Math.round(
          ((tilesX * tilesY) / 10000) * scatter.countPer100x100
        );
      } else {
        count = 1;
      }

      const minWidth = scatter.minWidth ?? width;
      const maxWidth = scatter.maxWidth ?? width;
      const minHeight = scatter.minHeight ?? height;
      const maxHeight = scatter.maxHeight ?? height;
      for (let j = 0, tries = 0; j < count && tries < count * MAX_TRIES; tries++) {
        // Random position anywhere on the map
        const randX = Math.floor(random() * tilesX);
        const randY = Math.floor(random() * tilesY);
        // Random size within range
        const width =
          minWidth + Math.floor(random() * (maxWidth - minWidth + 1));
        const height =
          minHeight + Math.floor(random() * (maxHeight - minHeight + 1));
        // Optionally random rotation
        const rotation =
          scatter.rotation !== undefined
            ? typeof scatter.rotation === "object"
              ? scatter.rotation.min +
                random() * (scatter.rotation.max - scatter.rotation.min)
              : scatter.rotation
            : this.instruction.rotation ?? 0;
        // Pick height for this rectangle
        let heightValue = height;
        if (scatter.height !== undefined) {
          heightValue = scatter.height;
        } else if (
          scatter.minHeightValue !== undefined &&
          scatter.maxHeightValue !== undefined
        ) {
          const minHV = scatter.minHeightValue;
          const maxHV = scatter.maxHeightValue;
          heightValue = minHV + Math.floor(random() * (maxHV - minHV + 1));
        }
        const drawn = this.generateRectangleStructure({
          ...this.instruction,
          position: { type: "exact", coords: [randX, randY] },
          width,
          height,
          rotation,
        });
        if (drawn || !this.instruction.skipBlocked) j++;
      }
    } else {
      this.generateRectangleStructure();
    }
  }

  /**
   * Draws the rectangle, or each scattered copy, centred on a tile the terrain filter accepts,
   * inside `position` when it is a range. Draws nothing where no tile matches.
   */
  private executeFiltered(): void {
    const { random, instruction, terrains, heightMap } = this;
    const { scatter, width, height, position } = instruction;
    const tilesX = terrains.length;
    const tilesY = terrains[0].length;
    const matcher = new TerrainFilterMatcher(
      instruction.terrainFilter!,
      terrains,
      heightMap,
    );

    let [minX, minY, maxX, maxY] = [0, 0, tilesX - 1, tilesY - 1];
    if (position?.type === "range") {
      minX = Math.floor((tilesX * position.min[0]) / 100);
      minY = Math.floor((tilesY * position.min[1]) / 100);
      maxX = Math.min(tilesX - 1, Math.floor((tilesX * position.max[0]) / 100));
      maxY = Math.min(tilesY - 1, Math.floor((tilesY * position.max[1]) / 100));
    }
    const candidates: [number, number][] = [];
    for (let x = minX; x <= maxX; x++)
      for (let y = minY; y <= maxY; y++)
        if (matcher.matches(x, y)) candidates.push([x, y]);
    if (candidates.length === 0) return;

    let count = 1;
    if (scatter?.count !== undefined) count = scatter.count;
    else if (scatter?.countPer100x100 !== undefined)
      count = Math.round(((tilesX * tilesY) / 10000) * scatter.countPer100x100);
    const minWidth = scatter?.minWidth ?? width;
    const maxWidth = scatter?.maxWidth ?? width;
    const minHeight = scatter?.minHeight ?? height;
    const maxHeight = scatter?.maxHeight ?? height;
    for (let j = 0, tries = 0; j < count && tries < count * MAX_TRIES; tries++) {
      const [x, y] = candidates[Math.floor(random() * candidates.length)];
      const drawn = this.generateRectangleStructure(
        {
          ...instruction,
          width: minWidth + Math.floor(random() * (maxWidth - minWidth + 1)),
          height: minHeight + Math.floor(random() * (maxHeight - minHeight + 1)),
        },
        [x, y],
      );
      if (drawn || !instruction.skipBlocked) j++;
    }
  }

  /**
   * Draws one rectangle, centred on `centre` (in tiles) when given, else on its `position`.
   * Returns false when `skipBlocked` left it undrawn.
   */
  private generateRectangleStructure(
    instruction = this.instruction,
    centre?: [number, number],
  ): boolean {
    const {
      width,
      height,
      rotation = 0,
      terrain,
      border,
      position: structurePosition,
      heightFilter,
      excludeTerrains,
      skipBlocked,
    } = instruction;
    const excluded = new Set(excludeTerrains ?? []);

    const { terrains, heightMap } = this;

    const tilesX = this.terrains.length;
    const tilesY = this.terrains[0].length;

    const [centerX, centerY] =
      centre ?? getPosition(structurePosition, tilesX, tilesY, this.random);

    // Precompute rotation
    const angleRad = (rotation * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    // Compute bounding box
    const halfW = width / 2;
    const halfH = height / 2;
    const borderWidth = border?.width ?? 0;

    // Axis-aligned bounding box for rotated rectangle
    const maxR = Math.ceil(
      Math.sqrt(halfW * halfW + halfH * halfH) + borderWidth
    );
    const minX = Math.max(0, Math.floor(centerX - maxR));
    const maxX = Math.min(tilesX - 1, Math.ceil(centerX + maxR));
    const minY = Math.max(0, Math.floor(centerY - maxR));
    const maxY = Math.min(tilesY - 1, Math.ceil(centerY + maxR));

    if (skipBlocked) {
      // Blocked when the fill would land on an excluded tile or touch its own terrain, which
      // would merge the two into one shape.
      for (let x = Math.max(0, minX - 1); x <= Math.min(tilesX - 1, maxX + 1); x++)
        for (let y = Math.max(0, minY - 1); y <= Math.min(tilesY - 1, maxY + 1); y++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const u = Math.abs(dx * cosA + dy * sinA) - halfW - borderWidth;
          const v = Math.abs(-dx * sinA + dy * cosA) - halfH - borderWidth;
          if (u <= 0 && v <= 0 && excluded.has(terrains[x][y])) return false;
          if (u <= 1 && v <= 1 && terrains[x][y] === terrain) return false;
        }
    }

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // Transform (x, y) to rectangle's local coordinates
        const dx = x - centerX;
        const dy = y - centerY;
        const localX = dx * cosA + dy * sinA;
        const localY = -dx * sinA + dy * cosA;

        if (excluded.has(terrains[x][y])) continue;

        // Check if inside main rectangle
        if (Math.abs(localX) <= halfW && Math.abs(localY) <= halfH) {
          // Only place if height matches, if heightValue is defined
          if (heightFilter === undefined || heightMap[x][y] === heightFilter) {
            terrains[x][y] = terrain;
          }

          continue;
        }
        // Check if inside border region
        if (
          border &&
          Math.abs(localX) <= halfW + borderWidth &&
          Math.abs(localY) <= halfH + borderWidth &&
          (Math.abs(localX) > halfW - 1 || Math.abs(localY) > halfH - 1)
        ) {
          terrains[x][y] = border.terrain;
        }
      }
    }
    return true;
  }
}
