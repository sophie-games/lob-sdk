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
    private xStartTile: number,
    private yStartTile: number,
  ) {
    this.random = randomSeeded(deriveSeed(seed, index + 1));
  }

  execute() {
    const { instruction, terrains, heightMap, objectives, tileSize, random } =
      this;

    const {
      player,
      team,
      objectiveType,
      chance,
      terrainFilter,
      minDistance = 0,
      maxObj = Infinity,
    } = instruction;

    // Check chance if provided (before processing tiles)
    if (chance !== undefined && random() * 100 >= chance) {
      return; // Skip this objective layer
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
            if (
              nx >= 0 &&
              nx < this.terrains.length &&
              ny >= 0 &&
              ny < this.terrains[0].length
            ) {
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

    // Do a random walk instead of always starting from the same place
    // TODO: this would be a good helper util that accepts a function, also used in natural path
    const xLen = this.terrains.length;
    const yLen = this.terrains[0].length;

    // Random starting offsets
    const xOffset = Math.round(this.random() * this.terrains.length);
    const yOffset = Math.round(this.random() * this.terrains[0].length);

    // Randomize directions: +1 (forward) or -1 (backward)
    const xStep = this.random() < 0.5 ? 1 : -1;
    const yStep = this.random() < 0.5 ? 1 : -1;

    // Randomize axis order
    const xFirst = this.random() < 0.5;

    let objectivesAdded = 0;
    for (let i = 0; i < (xFirst ? xLen : yLen); i++) {
      for (let j = 0; j < (xFirst ? yLen : xLen); j++) {
        let x = xFirst ? i : j;
        let y = xFirst ? j : i;
        x = (xOffset + x * xStep + xLen) % xLen; // adding length to fix negative modulos
        y = (yOffset + y * yStep + yLen) % yLen;

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
            (range) => height >= range.min && height <= range.max,
          );
          if (!heightValid) {
            continue;
          }
        }

        // Calculate the real position (center of tile)
        const positionX =
          x * tileSize + tileSize / 2 + tileSize * this.xStartTile;
        const positionY =
          y * tileSize + tileSize / 2 + tileSize * this.yStartTile;

        // Check minDistance constraint if provided (minDistance is in tile units)
        if (minDistance > 0) {
          let tooClose = false;

          for (const existingObjective of objectives) {
            // Note: these objectives can be outside of the bounds argument
            // Convert existing objective world position -> tile coordinates
            const existingTileX = Math.floor(
              existingObjective.pos.x / tileSize,
            );
            const existingTileY = Math.floor(
              existingObjective.pos.y / tileSize,
            );

            const dx = Math.abs(existingTileX - x - this.xStartTile);
            const dy = Math.abs(existingTileY - y - this.yStartTile);

            if (
              // octile distance
              dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy) <
              minDistance
            ) {
              tooClose = true;
              break;
            }
          }

          if (tooClose) {
            continue;
          }
        }

        const dto: ObjectiveDto<false> = {
          pos: { x: positionX, y: positionY },
          type: objectiveType,
        };
        if (team !== undefined) {
          dto.team = team;
        }
        if (player !== undefined) {
          dto.player = player;
        }
        objectives.push(dto);
        objectivesAdded++;
        if (objectivesAdded >= maxObj) {
          return;
        }
      }
    }
  }
}
