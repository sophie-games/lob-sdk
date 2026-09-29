import { InstructionSymmetry, TerrainType } from "@lob-sdk/types";
import { limitSlopes } from "../slopes";
import { InstructionArea } from "../frame-angle";

/**
 * Copies one half of the map onto the other, so two armies deployed on opposite halves meet the
 * same ground. With `terrains` set, a tile is copied only when it or its source holds one of them.
 * When the relief is copied, the seam is lowered where needed so neighbouring tiles stay within
 * one height level of each other.
 */
export class SymmetryExecutor {
  private readonly tilesX: number;
  private readonly tilesY: number;

  constructor(
    private readonly instruction: InstructionSymmetry,
    private readonly terrains: TerrainType[][],
    private readonly heightMap: number[][],
    /** On a turned map: the frame whose halves are kept and copied. */
    private readonly area?: InstructionArea,
  ) {
    this.tilesX = terrains.length;
    this.tilesY = terrains[0].length;
  }

  execute(): void {
    const { terrains, heightMap, instruction } = this;
    const copyHeights = instruction.heights ?? true;
    const copied = instruction.terrains ? new Set(instruction.terrains) : undefined;
    for (let x = 0; x < this.tilesX; x++) {
      for (let y = 0; y < this.tilesY; y++) {
        if (!this.isTarget(x, y)) continue;
        const [sx, sy] = this.sourceOf(x, y);
        if (!copied || copied.has(terrains[sx][sy]) || copied.has(terrains[x][y]))
          terrains[x][y] = terrains[sx][sy];
        if (copyHeights) heightMap[x][y] = heightMap[sx][sy];
      }
    }
    if (copyHeights) limitSlopes(heightMap);
  }

  /** Whether (x, y) lies in the half that is overwritten. An odd middle line is its own image. */
  private isTarget(x: number, y: number): boolean {
    if (this.area) return this.isTurnedTarget(x, y);
    switch (this.instruction.keep ?? "top") {
      case "top":
        return y >= Math.ceil(this.tilesY / 2);
      case "bottom":
        return y < Math.floor(this.tilesY / 2);
      case "left":
        return x >= Math.ceil(this.tilesX / 2);
      case "right":
        return x < Math.floor(this.tilesX / 2);
    }
  }

  /**
   * On a turned map, the halves are the turned frame's. A tile and its image under a half turn
   * lie either side of the frame's centre, so exactly one of them is overwritten.
   */
  private isTurnedTarget(x: number, y: number): boolean {
    const area = this.area!;
    if (!area.contains(x, y)) return false;
    const [u, v] = area.local(x, y);
    const du = u - (area.tilesX - 1) / 2;
    const dv = v - (area.tilesY - 1) / 2;
    const tie = 1e-6;
    switch (this.instruction.keep ?? "top") {
      case "top":
        return dv > tie || (Math.abs(dv) <= tie && du > tie);
      case "bottom":
        return dv < -tie || (Math.abs(dv) <= tie && du < -tie);
      case "left":
        return du > tie || (Math.abs(du) <= tie && dv > tie);
      case "right":
        return du < -tie || (Math.abs(du) <= tie && dv < -tie);
    }
  }

  /** The kept tile whose image lands on (x, y). */
  private sourceOf(x: number, y: number): [number, number] {
    const flippedX = this.tilesX - 1 - x;
    const flippedY = this.tilesY - 1 - y;
    const keep = this.instruction.keep ?? "top";
    if (this.area) {
      // A half turn about, or a mirror across, the area's own middle, to the nearest tile.
      const [u, v] = this.area.local(x, y);
      const [ru, rv] = [this.area.tilesX - 1 - u, this.area.tilesY - 1 - v];
      const [mu, mv] =
        this.instruction.mode === "rotate"
          ? [ru, rv]
          : keep === "top" || keep === "bottom"
            ? [u, rv]
            : [ru, v];
      const [mx, my] = this.area.toMap(mu, mv);
      return [
        Math.min(this.tilesX - 1, Math.max(0, Math.round(mx))),
        Math.min(this.tilesY - 1, Math.max(0, Math.round(my))),
      ];
    }
    if (this.instruction.mode === "rotate") return [flippedX, flippedY];
    return keep === "top" || keep === "bottom" ? [x, flippedY] : [flippedX, y];
  }
}
