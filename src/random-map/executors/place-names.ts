import { InstructionPlaceNames, MapLabel, TerrainType } from "@lob-sdk/types";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";
import { findEdgeClusters } from "../edge-clusters";

/** Flood-fills each edge-connected cluster of the instruction's terrains and labels the large ones. */
export class PlaceNamesExecutor {
  private readonly random: () => number;

  /** `offsetX`/`offsetY` place a bounded grid's tile 0 on the whole map, in tiles. */
  constructor(
    private instruction: InstructionPlaceNames,
    seed: number,
    index: number,
    private terrains: TerrainType[][],
    private tileSize: number,
    private offsetX: number,
    private offsetY: number,
    private labels: MapLabel[],
  ) {
    this.random = randomSeeded(deriveSeed(seed, index + 1));
  }

  execute() {
    const { minSize } = this.instruction;
    const clusters = findEdgeClusters(this.terrains, new Set(this.instruction.terrains))
      .filter((cluster) => cluster.length >= minSize)
      .sort((a, b) => b.length - a.length);
    const names = this.shuffledNames();
    const height = this.terrains[0].length;

    clusters.slice(0, names.length).forEach((cluster, i) => {
      const tile = this.middleTile(cluster, height);
      this.labels.push({
        text: names[i],
        pos: {
          x: (Math.floor(tile / height) + this.offsetX + 0.5) * this.tileSize,
          y: ((tile % height) + this.offsetY + 0.5) * this.tileSize,
        },
      });
    });
  }

  /** The cluster's tile nearest its centroid, so a ring-shaped wood is not labelled in its clearing. */
  private middleTile(cluster: number[], height: number): number {
    let cx = 0;
    let cy = 0;
    for (const tile of cluster) {
      cx += Math.floor(tile / height);
      cy += tile % height;
    }
    cx /= cluster.length;
    cy /= cluster.length;

    let best = cluster[0];
    let bestDistance = Infinity;
    for (const tile of cluster) {
      const distance = (Math.floor(tile / height) - cx) ** 2 + ((tile % height) - cy) ** 2;
      if (distance < bestDistance) {
        best = tile;
        bestDistance = distance;
      }
    }
    return best;
  }

  private shuffledNames(): string[] {
    const names = [...new Set(this.instruction.names)];
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [names[i], names[j]] = [names[j], names[i]];
    }
    return names;
  }
}
