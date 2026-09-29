import { InstructionSymmetry, TerrainType } from "@lob-sdk/types";

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
    if (copyHeights) this.limitSlopes();
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

  /**
   * Lowers every tile to at most one level above its lowest 8-neighbour. The result is each
   * tile's minimum over all tiles of height plus steps, which is unique, so a symmetric relief
   * stays symmetric.
   */
  private limitSlopes(): void {
    const { heightMap, tilesX, tilesY } = this;
    const queue: [number, number][] = [];
    for (let x = 0; x < tilesX; x++)
      for (let y = 0; y < tilesY; y++) queue.push([x, y]);
    queue.sort((a, b) => heightMap[a[0]][a[1]] - heightMap[b[0]][b[1]]);
    // Every lowered tile is queued again, so the pass ends at that fixed point in any order;
    // starting from the lowest tiles just keeps the re-queuing small.
    for (let head = 0; head < queue.length; head++) {
      const [x, y] = queue[head];
      const limit = heightMap[x][y] + 1;
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= tilesX || ny >= tilesY) continue;
          if (heightMap[nx][ny] > limit) {
            heightMap[nx][ny] = limit;
            queue.push([nx, ny]);
          }
        }
    }
  }
}
