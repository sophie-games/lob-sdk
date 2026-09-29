import { ObjectiveDto, TerrainType } from "@lob-sdk/types";
import { limitSlopes } from "./slopes";

/**
 * A procedural map drawn at an angle: the instructions run on a larger grid that covers the map
 * however it is turned, and the result is turned about its centre and cropped to the map. The
 * angle is in degrees, clockwise on screen.
 */
export class FrameAngle {
  private readonly cos: number;
  private readonly sin: number;
  /** Size of the grid the instructions run on. */
  readonly tilesX: number;
  readonly tilesY: number;

  constructor(
    angle: number,
    private readonly mapTilesX: number,
    private readonly mapTilesY: number,
  ) {
    const radians = (angle * Math.PI) / 180;
    this.cos = Math.cos(radians);
    this.sin = Math.sin(radians);
    const c = Math.abs(this.cos);
    const s = Math.abs(this.sin);
    // One tile of margin on every side, so rounding never samples outside the grid.
    this.tilesX = Math.ceil(mapTilesX * c + mapTilesY * s) + 2;
    this.tilesY = Math.ceil(mapTilesX * s + mapTilesY * c) + 2;
  }

  /** Turns the drawn grids onto the map, then lowers any slope the turn made steeper than one level a tile. */
  turn(terrains: TerrainType[][], heightMap: number[][]) {
    const outTerrains: TerrainType[][] = [];
    const outHeights: number[][] = [];
    for (let x = 0; x < this.mapTilesX; x++) {
      outTerrains[x] = [];
      outHeights[x] = [];
      for (let y = 0; y < this.mapTilesY; y++) {
        const [sx, sy] = this.source(x, y);
        outTerrains[x][y] = terrains[sx][sy];
        outHeights[x][y] = heightMap[sx][sy];
      }
    }
    limitSlopes(outHeights);
    return { terrains: outTerrains, heightMap: outHeights };
  }

  /**
   * Moves the objectives the instructions placed with the terrain under them, and drops any the
   * turn left off the map.
   */
  turnObjectives(objectives: ObjectiveDto<false>[], tileSize: number): ObjectiveDto<false>[] {
    const width = this.mapTilesX * tileSize;
    const height = this.mapTilesY * tileSize;
    return objectives
      .map((objective) => {
        const x = objective.pos.x - (this.tilesX * tileSize) / 2;
        const y = objective.pos.y - (this.tilesY * tileSize) / 2;
        return {
          ...objective,
          pos: {
            x: x * this.cos - y * this.sin + width / 2,
            y: x * this.sin + y * this.cos + height / 2,
          },
        };
      })
      .filter(({ pos }) => pos.x >= 0 && pos.y >= 0 && pos.x < width && pos.y < height);
  }

  /** The drawn tile that lands on map tile (x, y). */
  private source(x: number, y: number): [number, number] {
    const dx = x - (this.mapTilesX - 1) / 2;
    const dy = y - (this.mapTilesY - 1) / 2;
    const sx = Math.round(dx * this.cos + dy * this.sin + (this.tilesX - 1) / 2);
    const sy = Math.round(-dx * this.sin + dy * this.cos + (this.tilesY - 1) / 2);
    return [
      Math.min(this.tilesX - 1, Math.max(0, sx)),
      Math.min(this.tilesY - 1, Math.max(0, sy)),
    ];
  }
}
