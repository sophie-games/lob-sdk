import { IServerGame, UnitCategoryId } from "@lob-sdk/types";
import { BaseUnit } from "@lob-sdk/unit";
import { Vector2 } from "@lob-sdk/vector";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { AStar } from "../../a-star";
import { TerrainPreference } from "./types";

/**
 * Clamps a position to the map boundaries with a margin.
 */
export function clampToMap(pos: Vector2, game: IServerGame): Vector2 {
  const margin = 50;
  return new Vector2(
    Math.max(margin, Math.min(game.map.width - margin, pos.x)),
    Math.max(margin, Math.min(game.map.height - margin, pos.y)),
  );
}

/**
 * Splits an array of units into lines of a maximum size.
 */
export function splitIntoLines(units: BaseUnit[], maxPerLine: number): BaseUnit[][] {
  const lines: BaseUnit[][] = [];
  for (let i = 0; i < units.length; i += maxPerLine) {
    lines.push(units.slice(i, i + maxPerLine));
  }
  return lines;
}

/**
 * Splits cavalry units into left and right flanks.
 * Uses slice to maintain distance optimization if units are pre-sorted.
 */
export function splitCavalry(units: BaseUnit[]) {
  const mid = Math.floor(units.length / 2);
  return {
    left: units.slice(0, mid),
    right: units.slice(mid),
  };
}

/**
 * Calculates positions for units in a line and returns them.
 */
export function calculateLinePositions(
  units: BaseUnit[],
  center: Vector2,
  direction: Vector2,
  perpendicular: Vector2,
  forwardOffset: number,
  spacing: number,
  game: IServerGame,
): Vector2[] {
  if (units.length === 0) return [];

  const lineCenter = center.add(direction.scale(forwardOffset));
  const startOffset = -((units.length - 1) * spacing) / 2;

  return units.map((_, i) => {
    const pos = lineCenter.add(perpendicular.scale(startOffset + i * spacing));
    return clampToMap(pos, game);
  });
}

/**
 * Calculates positions for units on a flank and returns them.
 */
export function calculateFlankPositions(
  units: BaseUnit[],
  center: Vector2,
  direction: Vector2,
  perpendicular: Vector2,
  sideOffset: number,
  spacing: number,
  game: IServerGame,
  maxRows: number = 2,
  forwardOffset: number = 0,
): Vector2[] {
  if (units.length === 0) return [];

  const unitsPerLine = Math.ceil(units.length / maxRows);
  const flankStart = center
    .add(perpendicular.scale(sideOffset))
    .add(direction.scale(forwardOffset));

  return units.map((_, i) => {
    const row = Math.floor(i / unitsPerLine);
    const col = i % unitsPerLine;

    const lateralDirection = sideOffset > 0 ? 1 : -1;
    const lateralOffset = col * spacing * lateralDirection;

    const pos = flankStart
      .add(perpendicular.scale(lateralOffset))
      .subtract(direction.scale(row * spacing));

    return clampToMap(pos, game);
  });
}

/**
 * Sorts units along a given vector (e.g. the perpendicular of a line).
 * Uses position projection and unit ID tie-breaking for perfect determinism.
 */
export function sortUnitsAlongVector(units: BaseUnit[], vector: Vector2): BaseUnit[] {
  const normVec = vector.normalize();

  return [...units].sort((a, b) => {
    const projA = a.position.dot(normVec);
    const projB = b.position.dot(normVec);

    if (Math.abs(projA - projB) < 1) {
      return a.id - b.id;
    }

    return projA - projB;
  });
}

/**
 * Finds the most preferred position nearby based on categories and elevation.
 * Unified API for artillery high ground and skirmisher cover.
 */
export function findPreferredTerrain(
  pos: Vector2,
  game: IServerGame,
  gameDataManager: GameDataManager,
  preference: TerrainPreference,
  unitCategory: UnitCategoryId,
  searchRadiusTiles: number = 4,
): Vector2 {
  const tileSize = 16;
  const map = game.map;
  const centerX = Math.floor(pos.x / tileSize);
  const centerY = Math.floor(pos.y / tileSize);

  const tilesX = Math.floor(game.map.width / tileSize);
  const tilesY = Math.floor(game.map.height / tileSize);

  let bestPos = pos;
  let bestScore = -Infinity;

  // Pre-calculate category scores for performance
  const categoryScores = new Map<string, number>();
  Object.entries(preference.categoryPriority).forEach(([cat, priority]) => {
    if (priority === undefined) return;
    // User said: lower is better, e.g. 1 is highest priority.
    // We map 1 -> 1000, 2 -> 900, etc. (assuming priorities are 1-10)
    categoryScores.set(cat, (11 - priority) * 100);
  });

  for (let dx = -searchRadiusTiles; dx <= searchRadiusTiles; dx++) {
    for (let dy = -searchRadiusTiles; dy <= searchRadiusTiles; dy++) {
      const tx = centerX + dx;
      const ty = centerY + dy;

      if (tx >= 0 && tx < tilesX && ty >= 0 && ty < tilesY) {
        const checkPos = new Vector2(tx * tileSize + tileSize / 2, ty * tileSize + tileSize / 2);
        
        // Skip impassable tiles
        if (!isPassable(checkPos, game, gameDataManager, unitCategory)) continue;

        const terrainType = map.terrains[tx][ty];
        const category = gameDataManager.getCategoryByTerrain(terrainType);
        
        let score = categoryScores.get(category) || 0;

        if (preference.preferHighGround) {
          const height = map.heightMap[tx][ty] || 0;
          // Every meter of height counts as 10 score points if high ground is preferred
          score += height * 10;
        }

        // Slight penalty for distance from ideal center to prevent unnecessary flickering
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        score -= distToCenter;

        if (score > bestScore) {
          bestScore = score;
          bestPos = checkPos;
        }
      }
    }
  }

  return bestPos;
}

/**
 * @deprecated Use findPreferredTerrain instead
 */
export function findHighGroundNearby(
  pos: Vector2,
  game: IServerGame,
  unitCategory: UnitCategoryId,
  searchRadiusTiles: number = 3,
): Vector2 {
  return findPreferredTerrain(
    pos,
    game,
    GameDataManager.get("napoleonic"),
    {
      preferHighGround: true,
      categoryPriority: {}, // No preference
    },
    unitCategory,
    searchRadiusTiles,
  );
}

/**
 * @deprecated Use findPreferredTerrain instead
 */
export function findCoverNearby(
  pos: Vector2,
  game: IServerGame,
  unitCategory: UnitCategoryId,
  searchRadiusTiles: number = 3,
): Vector2 {
  const { TerrainCategoryType } = require("@lob-sdk/types");
  return findPreferredTerrain(
    pos,
    game,
    GameDataManager.get("napoleonic"),
    {
      preferHighGround: false,
      categoryPriority: {
        [TerrainCategoryType.Building]: 1,
        [TerrainCategoryType.Forest]: 1,
      },
    },
    unitCategory,
    searchRadiusTiles,
  );
}

/**
 * Checks if a position is passable for a unit, with an optional safety radius.
 */
export function isPassable(
  pos: Vector2,
  game: IServerGame,
  gameDataManager: GameDataManager,
  unitCategory: UnitCategoryId,
  safetyRadiusTiles: number = 0,
): boolean {
  const tileSize = 16;
  const tx = Math.floor(pos.x / tileSize);
  const ty = Math.floor(pos.y / tileSize);

  const tilesX = Math.floor(game.map.width / tileSize);
  const tilesY = Math.floor(game.map.height / tileSize);

  if (tx < 0 || tx >= tilesX || ty < 0 || ty >= tilesY) {
    return false;
  }

  // Check if primary tile is passable
  const checkTile = (x: number, y: number) => {
    if (x < 0 || x >= tilesX || y < 0 || y >= tilesY) return false;
    const terrainType = game.map.terrains[x][y];
    return gameDataManager.isPassable(terrainType, unitCategory);
  };

  if (!checkTile(tx, ty)) return false;

  // Check safety radius
  if (safetyRadiusTiles > 0) {
    for (let dx = -safetyRadiusTiles; dx <= safetyRadiusTiles; dx++) {
      for (let dy = -safetyRadiusTiles; dy <= safetyRadiusTiles; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (!checkTile(tx + dx, ty + dy)) return false;
      }
    }
  }

  return true;
}

/**
 * Checks if there is a clear straight path between two positions.
 */
export function isPathClear(
  start: Vector2,
  end: Vector2,
  game: IServerGame,
  gameDataManager: GameDataManager,
  unitCategory: UnitCategoryId,
): boolean {
  const diff = end.subtract(start);
  const distance = diff.length();
  
  if (distance < 16) return true; // Already there or very close

  const steps = Math.ceil(distance / 8); // Check every 8 pixels (half a tile)
  const stepVec = diff.scale(1 / steps);

  for (let i = 1; i <= steps; i++) {
    const checkPos = start.add(stepVec.scale(i));
    if (!isPassable(checkPos, game, gameDataManager, unitCategory, 1)) {
      return false;
    }
  }

  return true;
}

/**
 * Finds the nearest passable position to a target using BFS.
 */
export function findReachablePosition(
  target: Vector2,
  game: IServerGame,
  gameDataManager: GameDataManager,
  unitCategory: UnitCategoryId,
): Vector2 {
  // 1. Try with safety margin (1 tile)
  if (isPassable(target, game, gameDataManager, unitCategory, 1)) {
    return target;
  }

  const tileSize = 16;
  const centerX = Math.floor(target.x / tileSize);
  const centerY = Math.floor(target.y / tileSize);

  const tilesX = Math.floor(game.map.width / tileSize);
  const tilesY = Math.floor(game.map.height / tileSize);

  const queue: [number, number][] = [[centerX, centerY]];
  const visited = new Set<string>();
  visited.add(`${centerX},${centerY}`);

  // Two-pass search: first for "safe" tiles, then for "any" passable tile
  let fallbackPos: Vector2 | null = null;

  // Max search range of 100 tiles total
  let steps = 0;
  while (queue.length > 0 && steps < 100) {
    const [tx, ty] = queue.shift()!;
    steps++;

    const neighbors: [number, number][] = [
      [tx + 1, ty],
      [tx - 1, ty],
      [tx, ty + 1],
      [tx, ty - 1],
      [tx + 1, ty + 1],
      [tx - 1, ty - 1],
      [tx + 1, ty - 1],
      [tx - 1, ty + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= tilesX || ny < 0 || ny >= tilesY) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;

      const pos = new Vector2(nx * tileSize + tileSize / 2, ny * tileSize + tileSize / 2);
      
      // Check for safety first
      if (isPassable(pos, game, gameDataManager, unitCategory, 1)) {
        return pos;
      }
      
      // If not safe but passable, store as fallback
      if (!fallbackPos && isPassable(pos, game, gameDataManager, unitCategory, 0)) {
        fallbackPos = pos;
      }

      visited.add(key);
      queue.push([nx, ny]);
    }
  }

  return fallbackPos || target;
}

/**
 * Calculates a path from start to end, avoiding obstacles.
 */
export function calculatePath(
  start: Vector2,
  end: Vector2,
  unit: BaseUnit,
  game: IServerGame,
  gameDataManager: GameDataManager,
): Vector2[] {
  const tileSize = 16;
  
  // 1. Ensure end is reachable
  const unitTemplate = gameDataManager.getUnitTemplateManager().getTemplate(unit.type);
  const unitCategory = unitTemplate.category;
  const reachableEnd = findReachablePosition(end, game, gameDataManager, unitCategory);
  
  // 2. Optimization: Check if direct path is clear
  if (isPathClear(start, reachableEnd, game, gameDataManager, unitCategory)) {
    return [reachableEnd];
  }

  // 3. Setup A*
  const terrainCategories = gameDataManager.getTerrainCategories();
  const terrains = gameDataManager.getTerrains();

  const tilesX = Math.floor(game.map.width / tileSize);
  const tilesY = Math.floor(game.map.height / tileSize);

  const astar = new AStar(tilesX, tilesY, (from, to) => {
    // 1. Check destination tile passability
    const terrainType = game.map.terrains[to.x][to.y];
    const terrainConfig = terrains.find((t) => t.id === terrainType);
    if (!terrainConfig) return Infinity;

    // 2. Prevent diagonal clipping
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    // If it's a diagonal move, both horizontal/vertical neighbor tiles must be passable
    if (dx !== 0 && dy !== 0) {
      if (!isPassable(new Vector2(from.x * tileSize, to.y * tileSize), game, gameDataManager, unitCategory) ||
          !isPassable(new Vector2(to.x * tileSize, from.y * tileSize), game, gameDataManager, unitCategory)) {
        return Infinity;
      }
    }

    if (!gameDataManager.isPassable(terrainType, unitCategory)) return Infinity;
    
    const stepModifier = gameDataManager.getMovementModifier(terrainType, unitCategory);

    // Speed factor: 1 is base, higher is faster (lower cost)
    return 1 / (1 + stepModifier);
  });

  const startTile = { x: Math.floor(start.x / tileSize), y: Math.floor(start.y / tileSize) };
  const endTile = { x: Math.floor(reachableEnd.x / tileSize), y: Math.floor(reachableEnd.y / tileSize) };

  const path = astar.findPath(startTile, endTile);
  if (!path) {
    return [reachableEnd];
  }

  // 3. Convert tile path back to world coordinates
  return path.map((p) => new Vector2(p.x * tileSize + tileSize / 2, p.y * tileSize + tileSize / 2));
}
