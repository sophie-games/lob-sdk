import { Point2 } from "@lob-sdk/vector";
import {
  InstructionLake,
  ProceduralScenario,
  TerrainType,
} from "@lob-sdk/types";
import { getPosition } from "../utils";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";
import { createNoise2D, NoiseFunction2D } from "@lob-sdk/simplex-noise";
import { setHeightRecursively } from "@lob-sdk/utils";
import { CoordinateSet } from "@lob-sdk/data-structures";

interface LakeBody {
  center: Point2;
  radius: number;
  organicness: number;
}

export class LakeExecutor {
  private tilesX: number;
  private tilesY: number;
  private random: () => number;
  private noise: NoiseFunction2D;

  constructor(
    private instruction: InstructionLake,
    private scenario: ProceduralScenario,
    private seed: number,
    private index: number,
    private terrains: TerrainType[][],
    private heightMap: number[][]
  ) {
    this.tilesX = this.terrains.length;
    this.tilesY = this.terrains[0].length;

    this.random = randomSeeded(deriveSeed(seed, index + 1));
    this.noise = createNoise2D(this.random);
  }

  execute(): void {
    const { position, size, organicness } = this.instruction;

    const lakeBodies: LakeBody[] = [];

    const [positionX, positionY] = getPosition(
      position,
      this.tilesX,
      this.tilesY,
      this.random
    );
    const center = { x: positionX, y: positionY };

    const radius = this.getRandomRadius(size);

    lakeBodies.push({ center, radius, organicness });

    // Generate the actual lake terrain
    this.generateLakeTerrain(lakeBodies);
  }

  private getRandomRadius(sizeRange: { min: number; max: number }): number {
    const minRadius =
      (sizeRange.min / 100) * Math.min(this.tilesX, this.tilesY);
    const maxRadius =
      (sizeRange.max / 100) * Math.min(this.tilesX, this.tilesY);
    return minRadius + this.random() * (maxRadius - minRadius);
  }

  private generateLakeTerrain(lakeBodies: LakeBody[]): void {
    for (const lake of lakeBodies) {
      this.generateSingleLake(lake);
    }
  }

  private generateSingleLake(lake: LakeBody): void {
    const { center, radius, organicness } = lake;
    const maxRadius = radius + radius * 0.3; // Allow some variation

    // Calculate bounds that account for maximum organic variation
    const maxOrganicVariation = organicness * radius * 0.4;
    const expandedMaxRadius = maxRadius + maxOrganicVariation;

    const minX = Math.max(0, Math.floor(center.x - expandedMaxRadius));
    const maxX = Math.min(
      this.tilesX - 1,
      Math.floor(center.x + expandedMaxRadius)
    );
    const minY = Math.max(0, Math.floor(center.y - expandedMaxRadius));
    const maxY = Math.min(
      this.tilesY - 1,
      Math.floor(center.y + expandedMaxRadius)
    );

    const iterateNeighbors = (
      x: number,
      y: number,
      radius: number,
      callback: (dx: number, dy: number) => void
    ) => {
      for (let offsetX = -radius; offsetX <= radius; offsetX++) {
        for (let offsetY = -radius; offsetY <= radius; offsetY++) {
          if (offsetX === 0 && offsetY === 0) continue; // Skip the center

          // Chebyshev distance (king moves) for step cost
          const stepCost = Math.max(Math.abs(offsetX), Math.abs(offsetY));
          if (stepCost <= radius) {
            const nx = x + offsetX;
            const ny = y + offsetY;

            if (this.terrains[nx]?.[ny] !== undefined) {
              callback(nx, ny);
            }
          }
        }
      }
    };

    const deepTiles = new CoordinateSet();
    const shallowTiles = new CoordinateSet();

    // Step 1: Generate deep water core
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const dx = x - center.x;
        const dy = y - center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Apply organic variation to radius
        const angle = Math.atan2(dy, dx);
        const noiseValue = this.noise(Math.cos(angle) * 2, Math.sin(angle) * 2);
        const organicRadius = radius + noiseValue * organicness * radius * 0.4;

        if (distance <= organicRadius) {
          this.terrains[x][y] = this.instruction.terrains.deep;
          setHeightRecursively(x, y, 0, this.heightMap);
          deepTiles.add(x, y);
        }
      }
    }

    for (const [x, y] of deepTiles) {
      iterateNeighbors(x, y, 2, (dx, dy) => {
        if (deepTiles.has(dx, dy)) {
          return;
        }

        this.terrains[dx][dy] = this.instruction.terrains.shallow;
        setHeightRecursively(dx, dy, 0, this.heightMap);
        shallowTiles.add(dx, dy);
      });
    }

    for (const [x, y] of shallowTiles) {
      iterateNeighbors(x, y, 1, (dx, dy) => {
        if (deepTiles.has(dx, dy) || shallowTiles.has(dx, dy)) {
          return;
        }

        this.terrains[dx][dy] = this.instruction.terrains.shore;
        setHeightRecursively(dx, dy, 0, this.heightMap);
      });
    }
  }
}
