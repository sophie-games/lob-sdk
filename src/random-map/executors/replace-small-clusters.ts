import { InstructionReplaceSmallClusters, TerrainType } from "@lob-sdk/types";
import { findTerrainClusters } from "../terrain-clusters";

/** Flood-fills each edge-connected cluster of `fromTerrain` and repaints those of at most `maxSize` tiles. */
export class ReplaceSmallClustersExecutor {
  constructor(
    private instruction: InstructionReplaceSmallClusters,
    private terrains: TerrainType[][],
  ) {}

  execute() {
    const { fromTerrain, toTerrain, maxSize } = this.instruction;
    const { terrains } = this;
    const height = terrains[0].length;

    for (const cluster of findTerrainClusters(terrains, new Set([fromTerrain]))) {
      if (cluster.length > maxSize) continue;
      for (const tile of cluster) terrains[Math.floor(tile / height)][tile % height] = toTerrain;
    }
  }
}
