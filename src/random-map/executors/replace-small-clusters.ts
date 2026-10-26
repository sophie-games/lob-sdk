import { InstructionReplaceSmallClusters, TerrainType } from "@lob-sdk/types";

const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];

/** Flood-fills each edge-connected cluster of `fromTerrain` and repaints those of at most `maxSize` tiles. */
export class ReplaceSmallClustersExecutor {
  constructor(
    private instruction: InstructionReplaceSmallClusters,
    private terrains: TerrainType[][],
  ) {}

  execute() {
    const { fromTerrain, toTerrain, maxSize } = this.instruction;
    const { terrains } = this;
    const width = terrains.length;
    const height = terrains[0].length;
    const visited = new Uint8Array(width * height);

    for (let sx = 0; sx < width; sx++) {
      for (let sy = 0; sy < height; sy++) {
        if (visited[sx * height + sy] || terrains[sx][sy] !== fromTerrain) continue;
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
            if (visited[tile] || terrains[nx][ny] !== fromTerrain) continue;
            visited[tile] = 1;
            cluster.push(tile);
          }
        }
        if (cluster.length > maxSize) continue;
        for (const tile of cluster) terrains[Math.floor(tile / height)][tile % height] = toTerrain;
      }
    }
  }
}
