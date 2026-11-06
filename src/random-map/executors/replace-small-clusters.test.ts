import { InstructionType, TerrainType } from "@lob-sdk/types";
import { ReplaceSmallClustersExecutor } from "./replace-small-clusters";

const G = TerrainType.Grass;
const F = TerrainType.Farm;
const W = TerrainType.Forest;

/** Rows as drawn, turned into the generator's column-major [x][y] grid. */
function grid(rows: TerrainType[][]): TerrainType[][] {
  return rows[0].map((_, x) => rows.map((row) => row[x]));
}

function replace(terrains: TerrainType[][], maxSize: number) {
  new ReplaceSmallClustersExecutor(
    { type: InstructionType.ReplaceSmallClusters, fromTerrain: F, toTerrain: G, maxSize },
    terrains,
  ).execute();
  return terrains;
}

describe("ReplaceSmallClustersExecutor", () => {
  it("replaces clusters of at most maxSize tiles and keeps larger ones", () => {
    const terrains = grid([
      [F, G, G, F, F, F],
      [G, G, G, F, F, F],
      [F, F, G, G, G, G],
      [G, G, G, W, W, G],
    ]);

    expect(replace(terrains, 2)).toEqual(
      grid([
        [G, G, G, F, F, F],
        [G, G, G, F, F, F],
        [G, G, G, G, G, G],
        [G, G, G, W, W, G],
      ]),
    );
  });

  it("counts tiles touching only at a corner as separate clusters", () => {
    const terrains = grid([
      [F, G, G],
      [G, F, G],
      [G, G, F],
    ]);

    expect(replace(terrains, 1)).toEqual(
      grid([
        [G, G, G],
        [G, G, G],
        [G, G, G],
      ]),
    );
  });

  it("keeps a cluster of exactly maxSize + 1 tiles", () => {
    const terrains = grid([[F, F, F, G]]);

    expect(replace(terrains, 2)).toEqual(grid([[F, F, F, G]]));
  });
});
