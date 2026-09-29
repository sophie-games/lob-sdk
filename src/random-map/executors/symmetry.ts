import { InstructionSymmetry, TerrainType } from "@lob-sdk/types";
import { limitSlopes } from "../slopes";

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

  /** The kept tile whose image lands on (x, y). */
  private sourceOf(x: number, y: number): [number, number] {
    const flippedX = this.tilesX - 1 - x;
    const flippedY = this.tilesY - 1 - y;
    if (this.instruction.mode === "rotate") return [flippedX, flippedY];
    const keep = this.instruction.keep ?? "top";
    return keep === "top" || keep === "bottom" ? [x, flippedY] : [flippedX, y];
  }
}
