import { InstructionErosion } from "@lob-sdk/types";

/**
 * Under half a level of seeded roughness added before eroding, so water on level ground wanders
 * and branches instead of running in straight lines. Uncut ground rounds back to its level.
 */
const ROUGHNESS = 0.45;

/** The steepest a valley side stands, in levels a tile. */
const VALLEY_SIDE_STEP = 2;

/** Steps between re-tracing where water drains; the network barely moves from one step to the next. */
const DRAIN_EVERY = 4;

const DX = [-1, 0, 1, -1, 1, -1, 0, 1];
const DY = [-1, -1, -1, 0, 0, 1, 1, 1];
const DISTANCE = DX.map((dx, i) => Math.hypot(dx, DY[i]));

/**
 * Wears high ground down the way running water does (stream-power incision): every step, each
 * tile drains to a neighbour, the ground draining through each tile is summed, and a tile is cut
 * toward the one it drains to in proportion to the square root of that area.
 */
export class ErosionExecutor {
  constructor(
    private instruction: InstructionErosion,
    private heightMap: number[][],
    private maxHeightStep: number,
    private random: () => number,
  ) {}

  execute() {
    const { strength = 0.1, iterations = 60, minHeight = 0, channelArea = 4 } = this.instruction;
    const { heightMap } = this;
    const width = heightMap.length;
    const height = heightMap[0].length;
    const tiles = width * height;
    const original = new Float64Array(tiles);
    for (let x = 0; x < width; x++)
      for (let y = 0; y < height; y++) original[x * height + y] = heightMap[x][y];

    const ground = original.map((level) => level + ROUGHNESS * this.random());
    const drainage = new Drainage(width, height);
    const { drainsTo, distance, order } = drainage;
    // Ground draining through each tile, less what a gully needs to start, as a cutting rate.
    const rate = new Float64Array(tiles);
    for (let step = 0; step < iterations; step++) {
      if (step % DRAIN_EVERY === 0) {
        drainage.trace(ground);
        const area = new Float64Array(tiles).fill(1);
        for (let i = tiles - 1; i >= 0; i--) {
          const tile = order[i];
          if (drainsTo[tile] >= 0) area[drainsTo[tile]] += area[tile];
        }
        for (let tile = 0; tile < tiles; tile++)
          rate[tile] = (strength * Math.max(0, Math.sqrt(area[tile]) - Math.sqrt(channelArea))) / distance[tile];
      }
      // Outlets first, so each tile is cut toward the height its outlet already has (implicit, stable).
      for (let i = 0; i < tiles; i++) {
        const tile = order[i];
        const outlet = drainsTo[tile];
        if (outlet < 0 || rate[tile] === 0 || ground[tile] < minHeight || ground[tile] <= ground[outlet]) continue;
        ground[tile] = Math.max(minHeight, (ground[tile] + rate[tile] * ground[outlet]) / (1 + rate[tile]));
      }
    }

    const levels = new Int32Array(tiles);
    for (let tile = 0; tile < tiles; tile++)
      levels[tile] = Math.min(original[tile], Math.round(ground[tile]));
    widenValleys(levels, original, width, height, minHeight);
    this.keepHeightRule(levels, width, height);
    for (let x = 0; x < width; x++)
      for (let y = 0; y < height; y++) heightMap[x][y] = levels[x * height + y];
  }

  /**
   * Raises any tile cut more than a step below a neighbour back to that step. The uncut ground
   * already kept the rule, so no tile is raised above where it started.
   */
  private keepHeightRule(levels: Int32Array, width: number, height: number) {
    const step = Math.floor(this.maxHeightStep);
    for (let changed = true; changed; ) {
      changed = false;
      for (let x = 0; x < width; x++)
        for (let y = 0; y < height; y++) {
          const tile = x * height + y;
          for (let n = 0; n < 8; n++) {
            const nx = x + DX[n];
            const ny = y + DY[n];
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const floor = levels[nx * height + ny] - step;
            if (levels[tile] < floor) {
              levels[tile] = floor;
              changed = true;
            }
          }
        }
    }
  }
}

/**
 * Lets the ground beside each cut fall back to `VALLEY_SIDE_STEP` levels a tile, as valley sides slump, so a
 * gully opens into a V-shaped valley. Only ground next to a cut moves; uncut slopes stay as they
 * were.
 */
function widenValleys(levels: Int32Array, original: Float64Array, width: number, height: number, minHeight: number) {
  const queue: number[] = [];
  for (let tile = 0; tile < levels.length; tile++) if (levels[tile] < original[tile]) queue.push(tile);
  for (let head = 0; head < queue.length; head++) {
    const tile = queue[head];
    const x = Math.floor(tile / height);
    const y = tile - x * height;
    const side = Math.max(minHeight, levels[tile] + VALLEY_SIDE_STEP);
    for (let n = 0; n < 8; n++) {
      const nx = x + DX[n];
      const ny = y + DY[n];
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = nx * height + ny;
      if (levels[next] > side) {
        levels[next] = side;
        queue.push(next);
      }
    }
  }
}

/**
 * Where water drains, traced by flooding from the map's edges lowest first: each tile drains to
 * the neighbour it was reached from, so a hollow spills over its lowest rim, and `order` lists
 * the tiles from the outlets up.
 */
class Drainage {
  readonly drainsTo: Int32Array;
  readonly distance: Float64Array;
  readonly order: Int32Array;
  private reached: Uint8Array;
  private level: Float64Array;
  /** Binary min-heap of tiles keyed by `level`. */
  private heap: Int32Array;
  private size = 0;

  constructor(
    private width: number,
    private height: number,
  ) {
    const tiles = width * height;
    this.drainsTo = new Int32Array(tiles);
    this.distance = new Float64Array(tiles).fill(1);
    this.order = new Int32Array(tiles);
    this.reached = new Uint8Array(tiles);
    this.level = new Float64Array(tiles);
    this.heap = new Int32Array(tiles);
  }

  trace(ground: Float64Array) {
    const { width, height, drainsTo, distance, order, reached, level } = this;
    reached.fill(0);
    for (let x = 0; x < width; x++)
      for (let y = 0; y < height; y++)
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          const tile = x * height + y;
          reached[tile] = 1;
          drainsTo[tile] = -1;
          level[tile] = ground[tile];
          this.push(tile);
        }
    for (let count = 0; this.size > 0; count++) {
      const tile = this.pop();
      order[count] = tile;
      const x = Math.floor(tile / height);
      const y = tile - x * height;
      for (let n = 0; n < 8; n++) {
        const nx = x + DX[n];
        const ny = y + DY[n];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const next = nx * height + ny;
        if (reached[next]) continue;
        reached[next] = 1;
        drainsTo[next] = tile;
        distance[next] = DISTANCE[n];
        level[next] = Math.max(ground[next], level[tile]);
        this.push(next);
      }
    }
  }

  private push(tile: number) {
    const { heap, level } = this;
    let i = this.size++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (level[heap[parent]] <= level[tile]) break;
      heap[i] = heap[parent];
      i = parent;
    }
    heap[i] = tile;
  }

  private pop(): number {
    const { heap, level } = this;
    const top = heap[0];
    const last = heap[--this.size];
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      if (left >= this.size) break;
      const right = left + 1;
      const child = right < this.size && level[heap[right]] < level[heap[left]] ? right : left;
      if (level[heap[child]] >= level[last]) break;
      heap[i] = heap[child];
      i = child;
    }
    heap[i] = last;
    return top;
  }
}
