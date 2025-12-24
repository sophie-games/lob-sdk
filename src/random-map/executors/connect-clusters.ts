import {
  ProceduralScenario,
  InstructionConnectClusters,
  TerrainType,
} from "@lob-sdk/types";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";
import { NaturalPathGenerator } from "../natural-path-generator";
import { pack2D } from "@lob-sdk/utils";

export class ConnectClustersExecutor {
  private random: () => number;
  private visited = new Set<number>();

  constructor(
    private instruction: InstructionConnectClusters,
    private scenario: ProceduralScenario,
    private seed: number,
    private index: number,
    private terrains: TerrainType[][],
    private heightMap: number[][]
  ) {
    this.random = randomSeeded(deriveSeed(seed, index + 1));
  }

  /**
   * For each cluster, connects it to its single closest neighbor (or all equally-close neighbors in case of ties)
   * within maxClusterConnectDistance. Does not guarantee a fully connected graph.
   */
  execute() {
    const { terrains, random, heightMap } = this;

    const tilesX = this.terrains.length;
    const tilesY = this.terrains[0].length;

    const {
      fromTerrain,
      pathTerrain,
      minGroupSize,
      maxDistance,
      terrainReplacements,
      terrainCosts,
    } = this.instruction;

    // Helper to check if a terrain matches fromTerrain
    const isFromTerrain = (terrain: number) =>
      Array.isArray(fromTerrain)
        ? fromTerrain.includes(terrain)
        : terrain === fromTerrain;

    // Find all clusters of fromTerrain
    const clusters: {
      tiles: { x: number; y: number }[];
      centroid: { x: number; y: number };
    }[] = [];

    // Move directions array outside bfsCluster
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    // Optimized BFS: accumulate centroid sum during BFS, inline visited check/add
    const bfsCluster = (sx: number, sy: number) => {
      const queue = [{ x: sx, y: sy }];
      let head = 0;
      const cluster = [{ x: sx, y: sy }];
      let sumX = sx,
        sumY = sy;

      const startKey = pack2D(sx, sy);

      this.visited.add(startKey);
      while (head < queue.length) {
        const { x, y } = queue[head++];
        for (let d = 0; d < directions.length; d++) {
          const dx = directions[d][0],
            dy = directions[d][1];
          const nx = x + dx,
            ny = y + dy;
          const neighborKey = pack2D(nx, ny);
          if (
            nx >= 0 &&
            nx < tilesX &&
            ny >= 0 &&
            ny < tilesY &&
            !this.visited.has(neighborKey) &&
            isFromTerrain(terrains[nx][ny])
          ) {
            this.visited.add(neighborKey);
            queue.push({ x: nx, y: ny });
            cluster.push({ x: nx, y: ny });
            sumX += nx;
            sumY += ny;
          }
        }
      }
      return { cluster, sumX, sumY };
    };

    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        if (!this.visited.has(pack2D(x, y)) && isFromTerrain(terrains[x][y])) {
          const { cluster, sumX, sumY } = bfsCluster(x, y);
          if (cluster.length >= minGroupSize) {
            const centroid = {
              x: sumX / cluster.length,
              y: sumY / cluster.length,
            };
            clusters.push({ tiles: cluster, centroid });
          }
        }
      }
    }
    // For each cluster, connect to its closest neighbor(s) within maxClusterConnectDistance
    const n = clusters.length;
    // To avoid duplicate connections, use a Set of "i,j" where i < j
    const connectedPairs = new Set<string>();
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let closest: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dist =
          Math.abs(clusters[i].centroid.x - clusters[j].centroid.x) +
          Math.abs(clusters[i].centroid.y - clusters[j].centroid.y);
        if (dist > maxDistance) continue;
        if (dist < minDist) {
          minDist = dist;
          closest = [j];
        } else if (dist === minDist) {
          closest.push(j);
        }
      }
      for (const j of closest) {
        // Avoid duplicate connections (i < j)
        const key = i < j ? `${i},${j}` : `${j},${i}`;
        if (!connectedPairs.has(key)) {
          connectedPairs.add(key);
          // Connect cluster i to cluster j
          const clusterA = clusters[i];
          const clusterB = clusters[j];
          const start = {
            x: Math.round(clusterA.centroid.x),
            y: Math.round(clusterA.centroid.y),
          };
          const end = {
            x: Math.round(clusterB.centroid.x),
            y: Math.round(clusterB.centroid.y),
          };
          const pathGen = new NaturalPathGenerator(
            random,
            terrains,
            heightMap,
            1,
            0.5,
            4,
            terrainReplacements,
            terrainCosts
          );
          const path = pathGen.generatePath(start, end);
          const pathTiles = pathGen.getPathTiles(path);
          for (let k = 0; k < pathTiles.length; k++) {
            const x = pathTiles[k].x,
              y = pathTiles[k].y;
            if (
              x >= 0 &&
              x < tilesX &&
              y >= 0 &&
              y < tilesY &&
              !isFromTerrain(terrains[x][y])
            ) {
              const terrainType = pathGen.getTerrainForTile(
                x,
                y,
                pathTerrain,
                terrains
              );
              terrains[x][y] = terrainType;
            }
          }
        }
      }
    }
  }
}
