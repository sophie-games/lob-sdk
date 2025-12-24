import {
  ProceduralScenario,
  InstructionNaturalPath,
  TerrainType,
} from "@lob-sdk/types";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";
import { getRandomEdgePoints } from "../utils";
import { NaturalPathGenerator } from "../natural-path-generator";
import { Point2 } from "@lob-sdk/vector";
import { getRandomInt, setHeightRecursively } from "@lob-sdk/utils";

export class NaturalPathExecutor {
  private random: () => number;

  constructor(
    private instruction: InstructionNaturalPath,
    private scenario: ProceduralScenario,
    private seed: number,
    private index: number,
    private terrains: TerrainType[][],
    private heightMap: number[][]
  ) {
    this.random = randomSeeded(deriveSeed(seed, index + 1));
  }

  execute() {
    const { random, terrains, heightMap } = this;
    const {
      width,
      heightDiffCost,
      terrainReplacements,
      terrainCosts,
      amount,
      between,
      range = { min: 40, max: 60 },
      terrain,
      startHeightRanges,
      endHeightRanges,
      height,
    } = this.instruction;

    const tilesX = this.terrains.length;
    const tilesY = this.terrains[0].length;

    const naturalPathGenerator = new NaturalPathGenerator(
      random,
      terrains,
      heightMap,
      width,
      0.5,
      heightDiffCost,
      terrainReplacements,
      terrainCosts
    );
    const amountNumber = getRandomInt(amount.min, amount.max, random);

    for (let i = 0; i < amountNumber; i++) {
      let start, end;
      if (between === "edges") {
        const edgePoints = getRandomEdgePoints(tilesX, tilesY, random);
        start = edgePoints.start;
        end = edgePoints.end;
      } else if (between === "top-bottom") {
        // Vertical road: from top to bottom, with optional range
        const minX = Math.floor((range.min / 100) * tilesX);
        const maxX = Math.floor((range.max / 100) * tilesX);
        const startX = minX + Math.floor(random() * (maxX - minX + 1));
        const endX = minX + Math.floor(random() * (maxX - minX + 1));
        start = { x: startX, y: 0 };
        end = { x: endX, y: tilesY - 1 };
      } else if (between === "left-right") {
        // Horizontal road: from left to right, with optional range
        const minY = Math.floor((range.min / 100) * tilesY);
        const maxY = Math.floor((range.max / 100) * tilesY);
        const startY = minY + Math.floor(random() * (maxY - minY + 1));
        const endY = minY + Math.floor(random() * (maxY - minY + 1));
        start = { x: 0, y: startY };
        end = { x: tilesX - 1, y: endY };
      }

      if (start && end) {
        // Apply height filters if specified
        const validStart = this.findValidPointWithHeightFilter(
          start,
          startHeightRanges,
          between,
          tilesX,
          tilesY
        );
        const validEnd = this.findValidPointWithHeightFilter(
          end,
          endHeightRanges,
          between,
          tilesX,
          tilesY
        );

        if (validStart && validEnd) {
          const pathResult = naturalPathGenerator.generatePath(
            validStart,
            validEnd
          );
          const pathTiles = naturalPathGenerator.getPathTiles(pathResult);
          pathTiles.forEach(({ x, y }) => {
            if (x >= 0 && x < tilesX && y >= 0 && y < tilesY) {
              const terrainType = naturalPathGenerator.getTerrainForTile(
                x,
                y,
                terrain,
                terrains
              );
              terrains[x][y] = terrainType;

              if (height !== undefined) {
                setHeightRecursively(x, y, height, heightMap);
              }
            }
          });
        }
      }
    }
  }

  /**
   * Find a valid point that satisfies height ranges by searching along map edges
   * @param originalPoint The original point to search around
   * @param heightRanges Array of height ranges to check against
   * @param between The path direction type
   * @param tilesX Map width in tiles
   * @param tilesY Map height in tiles
   * @returns A valid point or null if none found
   */
  private findValidPointWithHeightFilter(
    originalPoint: Point2,
    heightRanges?: Array<{ min: number; max: number }>,
    between?: InstructionNaturalPath["between"],
    tilesX?: number,
    tilesY?: number
  ): Point2 | null {
    // If no height ranges specified, return original point
    if (!heightRanges || heightRanges.length === 0) {
      return originalPoint;
    }

    // Check if original point satisfies height ranges
    if (this.satisfiesHeightRanges(originalPoint, heightRanges)) {
      return originalPoint;
    }

    // If no between type specified, return null
    if (!between || !tilesX || !tilesY) {
      return null;
    }

    // Search along the appropriate edges based on the path type
    return this.findValidPointAlongEdges(heightRanges, between, tilesX, tilesY);
  }

  /**
   * Find a valid point by searching along map edges based on path direction
   * @param heightRanges Array of height ranges to check against
   * @param between The path direction type
   * @param tilesX Map width in tiles
   * @param tilesY Map height in tiles
   * @returns A valid point or null if none found
   */
  private findValidPointAlongEdges(
    heightRanges: Array<{ min: number; max: number }>,
    between: InstructionNaturalPath["between"],
    tilesX: number,
    tilesY: number
  ): Point2 | null {
    let edgePoints: Point2[];

    if (between === "edges") {
      // Search all edges: top, bottom, left, right
      edgePoints = this.getEdgePoints(tilesX, tilesY);
    } else if (between === "top-bottom") {
      // Search only top and bottom edges
      edgePoints = this.getTopBottomEdgePoints(tilesX, tilesY);
    } else if (between === "left-right") {
      // Search only left and right edges
      edgePoints = this.getLeftRightEdgePoints(tilesX, tilesY);
    } else {
      edgePoints = [];
    }

    // Shuffle the edge points for random selection
    this.shuffleArray(edgePoints);

    // Check each edge point until we find a valid one
    for (const point of edgePoints) {
      if (this.satisfiesHeightRanges(point, heightRanges)) {
        return point;
      }
    }

    return null; // No valid point found
  }

  /**
   * Get all edge points of the map
   */
  private getEdgePoints(tilesX: number, tilesY: number): Point2[] {
    const points: Point2[] = [];

    // Top edge
    for (let x = 0; x < tilesX; x++) {
      points.push({ x, y: 0 });
    }

    // Bottom edge
    for (let x = 0; x < tilesX; x++) {
      points.push({ x, y: tilesY - 1 });
    }

    // Left edge (excluding corners already covered)
    for (let y = 1; y < tilesY - 1; y++) {
      points.push({ x: 0, y });
    }

    // Right edge (excluding corners already covered)
    for (let y = 1; y < tilesY - 1; y++) {
      points.push({ x: tilesX - 1, y });
    }

    return points;
  }

  /**
   * Get top and bottom edge points
   */
  private getTopBottomEdgePoints(tilesX: number, tilesY: number): Point2[] {
    const points: Point2[] = [];

    // Top edge
    for (let x = 0; x < tilesX; x++) {
      points.push({ x, y: 0 });
    }

    // Bottom edge
    for (let x = 0; x < tilesX; x++) {
      points.push({ x, y: tilesY - 1 });
    }

    return points;
  }

  /**
   * Get left and right edge points
   */
  private getLeftRightEdgePoints(tilesX: number, tilesY: number): Point2[] {
    const points: Point2[] = [];

    // Left edge
    for (let y = 0; y < tilesY; y++) {
      points.push({ x: 0, y });
    }

    // Right edge
    for (let y = 0; y < tilesY; y++) {
      points.push({ x: tilesX - 1, y });
    }

    return points;
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Check if a point satisfies the given height ranges
   * @param point The point to check
   * @param ranges Array of height ranges to check against
   * @returns True if the point satisfies at least one range, false otherwise
   */
  private satisfiesHeightRanges(
    point: Point2,
    ranges: Array<{ min: number; max: number }>
  ): boolean {
    const height = this.heightMap[point.x][point.y];

    return ranges.some((range) => {
      return height >= range.min && height <= range.max;
    });
  }
}
