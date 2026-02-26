import {
  InstructionObjectiveLayer,
  ObjectiveDto,
  ProceduralScenario,
  TerrainType,
} from "@lob-sdk/types";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";
import { pack2D } from "@lob-sdk/utils";

export class ObjectiveLayerExecutor {
  private random: () => number;
  private neighbors: Array<[number, number]> = [
    [0, -1], // up
    [0, 1], // down
    [-1, 0], // left
    [1, 0], // right
  ];

  constructor(
    private instruction: InstructionObjectiveLayer,
    private tileSize: number,
    private scenario: ProceduralScenario,
    private seed: number,
    private index: number,
    private terrains: TerrainType[][],
    private heightMap: number[][],
    private objectives: ObjectiveDto<false>[],
    private tilesX: number,
    private tilesY: number
  ) {
    this.random = randomSeeded(deriveSeed(seed, index + 1));
  }

  execute() {
    const { instruction, terrains, heightMap, objectives, tileSize, random } =
      this;

    const {
      player,
      objectiveType,
      chance,
      terrainFilter,
      minDistance = 0,
    } = instruction;

    // Find all valid positions
    const validPositions: Array<{ x: number; y: number }> = [];

    // minDistance is in tile units, so we'll convert pixel distances to tile distances
    const minDistanceSquaredInTiles = minDistance * minDistance;
    const tileSizeSquared = tileSize * tileSize;

    // Check chance if provided (before processing tiles)
    if (chance !== undefined) {
      const roll = random() * 100;
      if (roll >= chance) {
        return; // Skip this objective layer
      }
    }

    // Helper function to check terrain filter using BFS
    const checkTerrainFilter = (startX: number, startY: number): boolean => {
      if (!terrainFilter) {
        return true; // No filter means all terrains are valid
      }

      const {
        terrains: allowedTerrains,
        searchRadius = 0,
        minAmount = 1,
      } = terrainFilter;
      const allowedTerrainsSet = new Set(allowedTerrains);

      if (searchRadius === 0) {
        // Simple check: just check the current tile
        const terrain = terrains[startX]?.[startY];
        return allowedTerrainsSet.has(terrain);
      }

      // BFS to count matching terrains within search radius
      const queue: Array<{ x: number; y: number; distance: number }> = [
        { x: startX, y: startY, distance: 0 },
      ];
      const visited = new Set<number>();
      let matchingCount = 0;

      while (queue.length > 0 && matchingCount < minAmount) {
        const current = queue.shift()!;
        const key = pack2D(current.x, current.y);

        if (visited.has(key)) {
          continue;
        }
        visited.add(key);

        // Only count tiles that are within the search radius (distance <= searchRadius)
        // and match one of the allowed terrains
        if (current.distance <= searchRadius) {
          const terrain = terrains[current.x]?.[current.y];
          if (terrain !== undefined && allowedTerrainsSet.has(terrain)) {
            matchingCount++;
          }
        }

        // Add neighbors if we haven't reached the maximum distance yet
        if (current.distance < searchRadius) {
          for (const [dx, dy] of this.neighbors) {
            const nx = current.x + dx;
            const ny = current.y + dy;

            // Check bounds
            if (nx >= 0 && nx < this.tilesX && ny >= 0 && ny < this.tilesY) {
              const neighborKey = pack2D(nx, ny);
              if (!visited.has(neighborKey)) {
                queue.push({ x: nx, y: ny, distance: current.distance + 1 });
              }
            }
          }
        }
      }

      return matchingCount >= minAmount;
    };

    const widthPx = this.tilesX * tileSize;
    const heightPx = this.tilesY * tileSize;

    for (let x = 0; x < this.tilesX; x++) {
      for (let y = 0; y < this.tilesY; y++) {
        // Check terrain filter constraint
        if (!checkTerrainFilter(x, y)) {
          continue;
        }

        // Check height constraint from terrain filter
        if (
          terrainFilter?.heights !== undefined &&
          terrainFilter.heights.length > 0
        ) {
          const height = heightMap[x]?.[y] ?? 0;
          const heightValid = terrainFilter.heights.some(
            (range) => height >= range.min && height <= range.max
          );
          if (!heightValid) {
            continue;
          }
        }

        // Calculate the position (center of tile)
        const positionX = x * tileSize + tileSize / 2;
        const positionY = y * tileSize + tileSize / 2;

        // Ensure objectives stay within map bounds
        // Objectives have a radius, so we need to leave some margin
        const radius = 32; // Approximate radius of an objective
        if (
          positionX < radius ||
          positionX > widthPx - radius ||
          positionY < radius ||
          positionY > heightPx - radius
        ) {
          continue; // Skip positions that would place objectives outside map
        }

        // Check minDistance constraint if provided (minDistance is in tile units)
        if (minDistanceSquaredInTiles > 0) {
          let tooClose = false;

          for (const existingObjective of objectives) {
            // Calculate distance in pixels
            const dx = existingObjective.pos.x - positionX;
            const dy = existingObjective.pos.y - positionY;
            const distanceSquaredInPixels = dx * dx + dy * dy;

            // Convert to tile units
            const distanceSquaredInTiles =
              distanceSquaredInPixels / tileSizeSquared;

            if (distanceSquaredInTiles < minDistanceSquaredInTiles) {
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
