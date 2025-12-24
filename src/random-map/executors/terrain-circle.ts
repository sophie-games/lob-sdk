import {
  ProceduralScenario,
  InstructionTerrainCircle,
  TerrainType,
} from "@lob-sdk/types";
import { createNoise2D, NoiseFunction2D } from "@lob-sdk/simplex-noise";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";
import { getPosition } from "../utils";
import { setHeightRecursively } from "@lob-sdk/utils";

export class TerrainCircleExecutor {
  private noise: NoiseFunction2D;
  private random: () => number;

  constructor(
    private instruction: InstructionTerrainCircle,
    private scenario: ProceduralScenario,
    private seed: number,
    private index: number,
    private terrains: TerrainType[][],
    private heightMap: number[][]
  ) {
    const derivedSeed = deriveSeed(seed, index + 1);
    this.random = randomSeeded(derivedSeed);
    this.noise = createNoise2D(this.random);
  }

  execute() {
    const { noise, terrains, heightMap, random } = this;

    const {
      terrain,
      radius: baseRadius,
      falloff,
      height,
      position: structurePosition,
      border,
    } = this.instruction;

    const tilesX = this.terrains.length;
    const tilesY = this.terrains[0].length;

    const [positionX, positionY] = getPosition(
      structurePosition,
      tilesX,
      tilesY,
      random
    );

    const minSize = Math.min(tilesX, tilesY);
    const radius = (baseRadius / 100) * minSize;

    const maxRadiusVariation = radius * 0.3;
    const borderWidth = border?.width ?? 0;

    // Include border in outer radius calculation
    const outerRadiusSquared = Math.pow(
      radius + maxRadiusVariation + borderWidth,
      2
    );

    const minX = Math.max(
      0,
      Math.floor(positionX - radius - maxRadiusVariation - borderWidth)
    );
    const maxX = Math.min(
      tilesX - 1,
      Math.floor(positionX + radius + maxRadiusVariation + borderWidth)
    );
    const minY = Math.max(
      0,
      Math.floor(positionY - radius - maxRadiusVariation - borderWidth)
    );
    const maxY = Math.min(
      tilesY - 1,
      Math.floor(positionY + radius + maxRadiusVariation + borderWidth)
    );

    const noiseScale = 1;
    const targetHeight = height;

    for (let x = minX; x <= maxX; x++) {
      const dx = x - positionX;
      const dxSquared = dx * dx;

      for (let y = minY; y <= maxY; y++) {
        const dy = y - positionY;
        const distanceSquared = dxSquared + dy * dy;

        if (distanceSquared > outerRadiusSquared) continue;

        const angle = Math.atan2(dy, dx);
        const noiseValue = noise(
          Math.cos(angle) * noiseScale,
          Math.sin(angle) * noiseScale
        );

        const modifiedRadius =
          radius + ((noiseValue + 1) / 2 - 0.5) * maxRadiusVariation * 2;
        const modifiedRadiusSquared = modifiedRadius * modifiedRadius;
        const borderInnerRadiusSquared = modifiedRadiusSquared;
        const modifiedBorderRadius = modifiedRadius + borderWidth;
        const modifiedBorderRadiusSquared =
          modifiedBorderRadius * modifiedBorderRadius;

        // First check if we're in the border region
        if (
          border &&
          distanceSquared > borderInnerRadiusSquared &&
          distanceSquared <= modifiedBorderRadiusSquared
        ) {
          terrains[x][y] = border.terrain;
          continue; // Skip to next iteration after setting border
        }

        // Then handle main structure if not in border
        if (distanceSquared <= modifiedRadiusSquared) {
          let influence = 1;
          const distance = Math.sqrt(distanceSquared);

          if (distance > radius * (1 - falloff)) {
            const falloffStart = radius * (1 - falloff);
            const falloffRange = modifiedRadius - falloffStart;
            influence = Math.max(
              0,
              1 - (distance - falloffStart) / falloffRange
            );
          }

          if (influence > 0) {
            terrains[x][y] = terrain;

            if (targetHeight !== undefined) {
              const currentHeight = heightMap[x][y];
              const newHeight = Math.floor(
                currentHeight * (1 - influence) + targetHeight * influence
              );
              setHeightRecursively(x, y, newHeight, heightMap);
            }
          }
        }
      }
    }
  }
}
