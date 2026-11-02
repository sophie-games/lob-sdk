import { InstructionPlaceNames, InstructionType, MapLabel, TerrainType } from "@lob-sdk/types";
import { PlaceNamesExecutor } from "./place-names";

const G = TerrainType.Grass;
const B = TerrainType.Building;
const C = TerrainType.City;
const F = TerrainType.Forest;

const TILE = 10;

/** Rows as drawn, turned into the generator's column-major [x][y] grid. */
function grid(rows: TerrainType[][]): TerrainType[][] {
  return rows[0].map((_, x) => rows.map((row) => row[x]));
}

function name(
  terrains: TerrainType[][],
  instruction: Partial<InstructionPlaceNames>,
  { seed = 1, offsetX = 0, offsetY = 0 } = {},
): MapLabel[] {
  const labels: MapLabel[] = [];
  new PlaceNamesExecutor(
    {
      type: InstructionType.PlaceNames,
      terrains: [B, C],
      names: ["Aubach"],
      minSize: 1,
      ...instruction,
    },
    seed,
    0,
    terrains,
    TILE,
    offsetX,
    offsetY,
    labels,
  ).execute();
  return labels;
}

describe("PlaceNamesExecutor", () => {
  it("labels a cluster at the centre of its middle tile", () => {
    const terrains = grid([
      [G, G, G, G],
      [G, B, B, B],
      [G, G, G, G],
    ]);

    expect(name(terrains, {})).toEqual([{ text: "Aubach", pos: { x: 25, y: 15 } }]);
  });

  it("treats tiles of any listed terrain as one cluster", () => {
    const terrains = grid([[B, C, B]]);

    expect(name(terrains, { names: ["Aubach", "Celle"] })).toHaveLength(1);
  });

  it("skips clusters smaller than minSize", () => {
    const terrains = grid([
      [B, G, B, B],
      [G, G, B, B],
    ]);

    expect(name(terrains, { minSize: 2 })).toEqual([{ text: "Aubach", pos: { x: 25, y: 5 } }]);
  });

  it("ignores terrain it was not asked to name", () => {
    expect(name(grid([[F, F, F]]), {})).toEqual([]);
  });

  it("keeps a label inside a cluster whose centroid falls outside it", () => {
    const terrains = grid([
      [F, F, F],
      [F, G, G],
      [F, F, F],
    ]);

    const [label] = name(terrains, { terrains: [F] });
    const x = Math.floor(label.pos.x / TILE);
    const y = Math.floor(label.pos.y / TILE);
    expect(terrains[x][y]).toBe(F);
  });

  it("gives each cluster a different name and the largest ones first when names run out", () => {
    const terrains = grid([
      [B, G, B, B, G, B, B, B],
    ]);

    const labels = name(terrains, { names: ["Aubach", "Celle"] });
    expect(labels).toHaveLength(2);
    expect(new Set(labels.map((label) => label.text)).size).toBe(2);
    expect(labels.map((label) => label.pos.x).sort((a, b) => a - b)).toEqual([25, 65]);
  });

  it("draws the same names for the same seed", () => {
    const terrains = grid([[B, G, B, G, B, G, B]]);
    const names = ["Aubach", "Celle", "Dorf", "Eschen", "Furth"];

    expect(name(terrains, { names }, { seed: 7 })).toEqual(name(terrains, { names }, { seed: 7 }));
  });

  it("joins patches up to maxDistance tiles apart into one place", () => {
    // Two hamlets either side of a two-tile road: their nearest tiles are 3 apart.
    const terrains = grid([[B, B, G, G, B, B]]);
    const names = ["Aubach", "Celle"];

    expect(name(terrains, { names })).toHaveLength(2);
    expect(name(terrains, { names, maxDistance: 2 })).toHaveLength(2);
    const joined = name(terrains, { names, maxDistance: 3 });
    expect(joined).toHaveLength(1);
    expect(terrains[Math.floor(joined[0].pos.x / TILE)][0]).toBe(B);
  });

  it("measures maxDistance across a diagonal as a straight line", () => {
    const terrains = grid([
      [B, G, G],
      [G, G, G],
      [G, G, B],
    ]);

    // The two tiles are 2.83 tiles apart, centre to centre.
    expect(name(terrains, { names: ["Aubach", "Celle"], maxDistance: 2 })).toHaveLength(2);
    expect(name(terrains, { names: ["Aubach", "Celle"], maxDistance: 3 })).toHaveLength(1);
  });

  it("places labels in whole-map pixels when the instruction is bounded", () => {
    expect(name(grid([[B]]), {}, { offsetX: 3, offsetY: 2 })).toEqual([
      { text: "Aubach", pos: { x: 35, y: 25 } },
    ]);
  });
});
