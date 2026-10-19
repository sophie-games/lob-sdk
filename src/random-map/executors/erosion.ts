import { InstructionErosion } from "@lob-sdk/types";

/**
 * Under half a level of seeded roughness added before eroding, so water on level ground wanders
 * and branches instead of running in straight lines. Uncut ground rounds back to its level.
 */
const ROUGHNESS = 0.45;

/** The steepest a valley side stands, in levels a tile. */
const VALLEY_SIDE_STEP = 2;

const DX = [-1, 0, 1, -1, 1, -1, 0, 1];
const DY = [-1, -1, -1, 0, 0, 1, 1, 1];
const DISTANCE = DX.map((dx, i) => Math.hypot(dx, DY[i]));

/**
 * Wears high ground down the way running water does (stream-power incision): each tile drains to
 * a neighbour, the ground draining through each tile is summed, and every step a tile is cut
 * toward the one it drains to in proportion to the square root of that area.
 *
 * Drainage is traced once. A tile is only ever cut toward its outlet and never below it, so
 * the ground stays sloped the way it was traced and the network holds for every step; each step
 * then visits only the tiles that cut, in a linear pass.
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
    const { drainsTo, distance, order } = traceDrainage(ground, width, height);
    const area = new Float64Array(tiles).fill(1);
    for (let i = tiles - 1; i >= 0; i--) {
      const tile = order[i];
      if (drainsTo[tile] >= 0) area[drainsTo[tile]] += area[tile];
    }
    // The tiles that cut, outlets first, so each is cut toward the height its outlet already has
    // (implicit, stable), with its cutting rate.
    const cutting: number[] = [];
    const rates: number[] = [];
    const threshold = Math.sqrt(channelArea);
    for (let i = 0; i < tiles; i++) {
      const tile = order[i];
      const excess = Math.sqrt(area[tile]) - threshold;
      if (drainsTo[tile] < 0 || excess <= 0 || ground[tile] < minHeight) continue;
      cutting.push(tile);
      rates.push((strength * excess) / distance[tile]);
    }
    for (let step = 0; step < iterations; step++)
      for (let i = 0; i < cutting.length; i++) {
        const tile = cutting[i];
        const outlet = ground[drainsTo[tile]];
        if (ground[tile] <= outlet) continue;
        ground[tile] = Math.max(minHeight, (ground[tile] + rates[i] * outlet) / (1 + rates[i]));
      }

    const levels = new Int32Array(tiles);
    for (let tile = 0; tile < tiles; tile++)
      levels[tile] = Math.min(original[tile], Math.round(ground[tile]));
    widenValleys(levels, original, width, height, minHeight);
    this.keepHeightRule(levels, original, width, height);
    for (let x = 0; x < width; x++)
      for (let y = 0; y < height; y++) heightMap[x][y] = levels[x * height + y];
  }

  /**
   * Raises any tile cut more than a step below a neighbour back to that step, working outward
   * from the cut tiles only. The uncut ground already kept the rule, so no tile is raised above
   * where it started.
   */
  private keepHeightRule(levels: Int32Array, original: Float64Array, width: number, height: number) {
    const step = Math.floor(this.maxHeightStep);
    const queue: number[] = [];
    for (let tile = 0; tile < levels.length; tile++) if (levels[tile] < original[tile]) queue.push(tile);
    for (let head = 0; head < queue.length; head++) {
      const tile = queue[head];
      const x = Math.floor(tile / height);
      const y = tile - x * height;
      let floor = levels[tile];
      for (let n = 0; n < 8; n++) {
        const nx = x + DX[n];
        const ny = y + DY[n];
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) floor = Math.max(floor, levels[nx * height + ny] - step);
      }
      if (floor === levels[tile]) continue;
      levels[tile] = floor;
      // A raised tile may now stand more than a step above a neighbour.
      for (let n = 0; n < 8; n++) {
        const nx = x + DX[n];
        const ny = y + DY[n];
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && levels[nx * height + ny] < floor - step)
          queue.push(nx * height + ny);
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
 * the neighbour it was reached from (-1 at the edge), so a hollow spills over its lowest rim, and
 * `order` lists the tiles from the outlets up.
 */
function traceDrainage(ground: Float64Array, width: number, height: number) {
  const tiles = width * height;
  const drainsTo = new Int32Array(tiles);
  const distance = new Float64Array(tiles).fill(1);
  const order = new Int32Array(tiles);
  const reached = new Uint8Array(tiles);
  const level = new Float64Array(tiles);
  // Binary min-heap of tiles keyed by `level`.
  const heap = new Int32Array(tiles);
  let size = 0;
  const push = (tile: number) => {
    let i = size++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (level[heap[parent]] <= level[tile]) break;
      heap[i] = heap[parent];
      i = parent;
    }
    heap[i] = tile;
  };
  const pop = () => {
    const top = heap[0];
    const last = heap[--size];
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      if (left >= size) break;
      const right = left + 1;
      const child = right < size && level[heap[right]] < level[heap[left]] ? right : left;
      if (level[heap[child]] >= level[last]) break;
      heap[i] = heap[child];
      i = child;
    }
    heap[i] = last;
    return top;
  };

  for (let x = 0; x < width; x++)
    for (let y = 0; y < height; y++)
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        const tile = x * height + y;
        reached[tile] = 1;
        drainsTo[tile] = -1;
        level[tile] = ground[tile];
        push(tile);
      }
  for (let count = 0; size > 0; count++) {
    const tile = pop();
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
      push(next);
    }
  }
  return { drainsTo, distance, order };
}
