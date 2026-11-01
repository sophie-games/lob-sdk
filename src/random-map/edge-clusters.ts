import { TerrainType } from "@lob-sdk/types";

const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];

/**
 * Every cluster of tiles whose terrain is in `members`, tiles joining when they share an edge,
 * each as tile indices `x * height + y` in flood order from its first tile in scan order.
 */
export function findEdgeClusters(terrains: TerrainType[][], members: Set<TerrainType>): number[][] {
  const width = terrains.length;
  const height = terrains[0].length;
  const visited = new Uint8Array(width * height);
  const clusters: number[][] = [];

  for (let sx = 0; sx < width; sx++) {
    for (let sy = 0; sy < height; sy++) {
      if (visited[sx * height + sy] || !members.has(terrains[sx][sy])) continue;
      visited[sx * height + sy] = 1;
      const cluster = [sx * height + sy];
      for (let head = 0; head < cluster.length; head++) {
        const x = Math.floor(cluster[head] / height);
        const y = cluster[head] % height;
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d];
          const ny = y + DY[d];
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const tile = nx * height + ny;
          if (visited[tile] || !members.has(terrains[nx][ny])) continue;
          visited[tile] = 1;
          cluster.push(tile);
        }
      }
      clusters.push(cluster);
    }
  }
  return clusters;
}
