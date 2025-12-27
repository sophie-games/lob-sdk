import {
  InstructionObjectiveLayer,
  ObjectiveDto,
  ProceduralScenario,
  TerrainType,
} from "@lob-sdk/types";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";

export class ObjectiveLayerExecutor {
  private random: () => number;

  constructor(
    private instruction: InstructionObjectiveLayer,
    private tileSize: number,
    private scenario: ProceduralScenario,
    private seed: number,
    private index: number,
    private terrains: TerrainType[][],
    private heightMap: number[][],
    private objectives: ObjectiveDto<false>[],
    private width: number,
    private height: number
  ) {
    this.random = randomSeeded(deriveSeed(seed, index + 1));
  }

  execute() {
    const {
      width,
      height,
      instruction,
      terrains,
      heightMap,
      objectives,
      tileSize,
      random,
    } = this;

    const {
      player,
      objectiveType,
      chance,
      terrains: allowedTerrains,
      heights: allowedHeights,
      minDistance = 0,
    } = instruction;

    // Find all valid positions
    const validPositions: Array<{ x: number; y: number }> = [];

    const allowedTerrainsSet = new Set(allowedTerrains);

    const tilesX = Math.floor(width / tileSize);
    const tilesY = Math.floor(height / tileSize);

    const minDistanceSquared = minDistance * minDistance;

    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        // Check chance if provided
        if (chance !== undefined) {
          const roll = random() * 100;
          if (roll >= chance) {
            return; // Skip this objective layer
          }
        }

        // Check terrain constraint
        if (allowedTerrainsSet.size > 0) {
          const terrain = terrains[x]?.[y];
          if (!allowedTerrainsSet.has(terrain)) {
            continue;
          }
        }

        // Check height constraint
        if (allowedHeights !== undefined && allowedHeights.length > 0) {
          const height = heightMap[x]?.[y] ?? 0;
          const heightValid = allowedHeights.some(
            (range) => height >= range.min && height <= range.max
          );
          if (!heightValid) {
            continue;
          }
        }

        // Calculate the position (center of tile)
        const positionX = x * tileSize + tileSize / 2;
        const positionY = y * tileSize + tileSize / 2;

        // Check minDistance constraint if provided
        if (minDistanceSquared > 0) {
          let tooClose = false;

          for (const existingObjective of objectives) {
            const dx = existingObjective.pos.x - positionX;
            const dy = existingObjective.pos.y - positionY;
            const distanceSquared = dx * dx + dy * dy;

            if (distanceSquared < minDistanceSquared) {
              tooClose = true;
              break;
            }
          }

          if (tooClose) {
            continue;
          }
        }

        validPositions.push({ x: positionX, y: positionY });
        objectives.push({
          pos: { x: positionX, y: positionY },
          player: player,
          type: objectiveType,
        });
      }
    }
  }
}
