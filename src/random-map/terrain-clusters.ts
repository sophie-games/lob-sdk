import { TerrainType } from "@lob-sdk/types";

/** Offsets to every tile whose centre lies within `maxDistance` tiles, the tile itself excluded. */
function neighbourOffsets(maxDistance: number): [number, number][] {
  const reach = Math.floor(maxDistance);
  const offsets: [number, number][] = [];
  for (let dx = -reach; dx <= reach; dx++) {
    for (let dy = -reach; dy <= reach; dy++) {
      if ((dx || dy) && dx * dx + dy * dy <= maxDistance * maxDistance) offsets.push([dx, dy]);
    }
  }
  return offsets;
}

/**
 * Every cluster of tiles whose terrain is in `members`, tiles joining when their centres are at
 * most `maxDistance` tiles apart (default 1: when they share an edge), each as tile indices
 * `x * height + y` in flood order from its first tile in scan order.
 */
export function findTerrainClusters(
  terrains: TerrainType[][],
  members: Set<TerrainType>,
  maxDistance = 1,
): number[][] {
  const width = terrains.length;
  const height = terrains[0].length;
  const offsets = neighbourOffsets(maxDistance);
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
        for (const [dx, dy] of offsets) {
          const nx = x + dx;
          const ny = y + dy;
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
