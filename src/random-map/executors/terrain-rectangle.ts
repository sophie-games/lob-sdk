import {
  ProceduralScenario,
  InstructionTerrainRectangle,
  TerrainType,
} from "@lob-sdk/types";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";
import { getPosition } from "../utils";

export class TerrainRectangleExecutor {
  private random: () => number;

  constructor(
    private instruction: InstructionTerrainRectangle,
    private scenario: ProceduralScenario,
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
      for (let j = 0; j < count; j++) {
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
        this.generateRectangleStructure({
          ...this.instruction,
          position: { type: "exact", coords: [randX, randY] },
          width,
          height,
          rotation,
        });
      }
    } else {
      this.generateRectangleStructure();
    }
  }

  private generateRectangleStructure(instruction = this.instruction): void {
    const {
      width,
      height,
      rotation = 0,
      terrain,
      border,
      position: structurePosition,
      heightFilter,
    } = instruction;

    const { terrains, heightMap } = this;

    const tilesX = this.terrains.length;
    const tilesY = this.terrains[0].length;

    const [centerX, centerY] = getPosition(
      structurePosition,
      tilesX,
      tilesY,
      this.random
    );

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

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // Transform (x, y) to rectangle's local coordinates
        const dx = x - centerX;
        const dy = y - centerY;
        const localX = dx * cosA + dy * sinA;
        const localY = -dx * sinA + dy * cosA;

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
  }
}
