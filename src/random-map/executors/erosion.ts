import { InstructionErosion } from "@lob-sdk/types";

/**
 * Seeded roughness added before eroding, so water on level ground wanders and branches instead of
 * running in straight lines.
 */
const ROUGHNESS = 0.1;

/** The steepest a valley side stands, in levels a tile. */
const VALLEY_SIDE_SLOPE = 1;

/** Blur passes that turn the terraces into slopes, and round crests, before the water runs. */
const TERRACE_SMOOTHING = 2;

/** Blur passes over the cut, rounding valley floors and the ridges between valleys. */
const CUT_SMOOTHING = 1;

const DX = [-1, 0, 1, -1, 1, -1, 0, 1];
const DY = [-1, -1, -1, 0, 0, 1, 1, 1];
const DISTANCE = DX.map((dx, i) => Math.hypot(dx, DY[i]));

/**
 * Wears high ground down the way running water does (stream-power incision): each tile drains to
 * a neighbour, the ground draining through each tile is summed, and every step a tile is cut
 * toward the one it drains to in proportion to the square root of that area.
 *
 * The water runs over the terraces blurred into slopes, so it cuts all the way down a flank and
 * not only where it drops off a terrace edge. Gullies open into flat-floored valleys with gentle
 * sides, and the cut, smoothed, is taken off the ground with its crests rounded, then rounded to
 * whole levels.
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
    const { strength = 0.1, iterations = 60, minHeight = 0, channelArea = 12 } = this.instruction;
    const { heightMap } = this;
    const width = heightMap.length;
    const height = heightMap[0].length;
    const tiles = width * height;
    const original = new Float64Array(tiles);
    for (let x = 0; x < width; x++)
      for (let y = 0; y < height; y++) original[x * height + y] = heightMap[x][y];
    const erodes = (tile: number) => original[tile] >= minHeight;

    const smooth = blur(original, width, height, TERRACE_SMOOTHING);
    const uncut = smooth.map((level) => level + ROUGHNESS * this.random());
    const ground = uncut.slice();
    const { drainsTo, distance, order } = traceDrainage(ground, width, height);
    const area = new Float64Array(tiles).fill(1);
    for (let i = tiles - 1; i >= 0; i--) {
      const tile = order[i];
      if (drainsTo[tile] >= 0) area[drainsTo[tile]] += area[tile];
    }
    // The tiles that cut, outlets first, so each is cut toward the height its outlet already has
    // (implicit, stable), with its cutting rate.
    const cutting = new Int32Array(tiles);
    const rates = new Float64Array(tiles);
    let count = 0;
    const threshold = Math.sqrt(channelArea);
    for (let i = 0; i < tiles; i++) {
      const tile = order[i];
      const excess = Math.sqrt(area[tile]) - threshold;
      if (drainsTo[tile] < 0 || excess <= 0 || !erodes(tile)) continue;
      cutting[count] = tile;
      rates[count++] = (strength * excess) / distance[tile];
    }
    for (let step = 0; step < iterations; step++)
      for (let i = 0; i < count; i++) {
        const tile = cutting[i];
        const outlet = ground[drainsTo[tile]];
        if (ground[tile] <= Math.max(outlet, minHeight)) continue;
        ground[tile] = Math.max(minHeight, (ground[tile] + rates[i] * outlet) / (1 + rates[i]));
      }
    widenFloors(ground, uncut, width, height, minHeight, erodes);
    widenValleys(ground, uncut, width, height);

    const cut = blur(
      uncut.map((level, tile) => level - ground[tile]),
      width,
      height,
      CUT_SMOOTHING,
    );
    const levels = original.slice();
    for (let tile = 0; tile < tiles; tile++)
      if (erodes(tile))
        levels[tile] = Math.min(
          original[tile],
          Math.max(minHeight, Math.round(Math.min(original[tile], smooth[tile]) - cut[tile])),
        );
    trimRidges(levels, original, width, height);
    this.keepHeightRule(levels, original, width, height);
    drainHollows(levels, original, width, height);
    for (let x = 0; x < width; x++)
      for (let y = 0; y < height; y++) heightMap[x][y] = levels[x * height + y];
  }

  /**
   * Raises any tile cut more than a step below a neighbour back to that step, working outward
   * from the cut tiles only. The uncut ground already kept the rule, so no tile is raised above
   * where it started.
   */
  private keepHeightRule(levels: Float64Array, original: Float64Array, width: number, height: number) {
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
 * Cuts the tiles around each gully as deep as it, so the valley has a floor wider than a tile and
 * still shows once the cut is rounded to whole levels.
 */
function widenFloors(
  ground: Float64Array,
  uncut: Float64Array,
  width: number,
  height: number,
  minHeight: number,
  erodes: (tile: number) => boolean,
) {
  const depth = uncut.map((level, tile) => level - ground[tile]);
  for (let x = 0; x < width; x++)
    for (let y = 0; y < height; y++) {
      const tile = x * height + y;
      if (!erodes(tile)) continue;
      const inside = x > 0 && y > 0 && x < width - 1 && y < height - 1;
      let deepest = depth[tile];
      for (let n = 0; n < 8; n++)
        if (inside || onMap(x + DX[n], y + DY[n], width, height))
          deepest = Math.max(deepest, depth[tile + DX[n] * height + DY[n]]);
      ground[tile] = Math.min(ground[tile], Math.max(minHeight, uncut[tile] - deepest));
    }
}

/**
 * Lets the ground beside each cut fall back to `VALLEY_SIDE_SLOPE`, as valley sides slump, so a
 * gully opens into a valley. Only ground next to a cut moves; uncut slopes stay as they were.
 */
function widenValleys(ground: Float64Array, uncut: Float64Array, width: number, height: number) {
  const queue: number[] = [];
  for (let tile = 0; tile < ground.length; tile++) if (ground[tile] < uncut[tile]) queue.push(tile);
  for (let head = 0; head < queue.length; head++) {
    const tile = queue[head];
    const x = Math.floor(tile / height);
    const y = tile - x * height;
    for (let n = 0; n < 8; n++) {
      const nx = x + DX[n];
      const ny = y + DY[n];
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = nx * height + ny;
      const side = ground[tile] + VALLEY_SIDE_SLOPE * DISTANCE[n];
      if (ground[next] > side) {
        ground[next] = side;
        queue.push(next);
      }
    }
  }
}

/**
 * Brings down any ground left standing one tile wide between two cuts, to the higher of them, so
 * neighbouring valleys meet in a rounded ridge rather than a knife edge.
 */
function trimRidges(levels: Float64Array, original: Float64Array, width: number, height: number) {
  // Bringing a tile down can leave the next one standing alone.
  for (let trimmed = true; trimmed; ) {
    trimmed = false;
    for (let x = 1; x < width - 1; x++)
      for (let y = 1; y < height - 1; y++) {
        const tile = x * height + y;
        if (trimBetween(levels, original, tile, tile - height, tile + height)) trimmed = true;
        if (trimBetween(levels, original, tile, tile - 1, tile + 1)) trimmed = true;
      }
  }
}

/** Brings `tile` down to the higher of `a` and `b` if it stands above both and both are cut. */
function trimBetween(levels: Float64Array, original: Float64Array, tile: number, a: number, b: number): boolean {
  if (levels[a] >= original[a] || levels[b] >= original[b] || levels[a] >= levels[tile] || levels[b] >= levels[tile])
    return false;
  levels[tile] = Math.max(levels[a], levels[b]);
  return true;
}

/** `passes` of a 3x3 box blur, the map's edge repeating outward. */
function blur(field: Float64Array, width: number, height: number, passes: number): Float64Array {
  let current = field;
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float64Array(current.length);
    for (let x = 0; x < width; x++)
      for (let y = 0; y < height; y++) {
        let sum = 0;
        if (x > 0 && y > 0 && x < width - 1 && y < height - 1) {
          // Summed in the same order as the edge case below, so both round alike.
          for (let column = (x - 1) * height + y; column <= (x + 1) * height + y; column += height) {
            sum += current[column - 1];
            sum += current[column];
            sum += current[column + 1];
          }
        } else
          for (let dx = -1; dx <= 1; dx++)
            for (let dy = -1; dy <= 1; dy++) {
              const nx = Math.min(width - 1, Math.max(0, x + dx));
              const ny = Math.min(height - 1, Math.max(0, y + dy));
              sum += current[nx * height + ny];
            }
        next[x * height + y] = sum / 9;
      }
    current = next;
  }
  return current;
}

/**
 * Raises any cut ground water could not run off back to the level it spills at, so rounding the
 * cut leaves no hollow to pool water. Never raises a tile above where it started, nor lifts a
 * hollow the ground already had.
 */
function drainHollows(levels: Float64Array, original: Float64Array, width: number, height: number) {
  const spill = spillLevels(levels, width, height);
  for (let tile = 0; tile < levels.length; tile++)
    levels[tile] = Math.max(levels[tile], Math.min(original[tile], spill[tile]));
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
  const heap = new TileHeap(tiles);
  forEachEdgeTile(width, height, (tile) => {
    reached[tile] = 1;
    drainsTo[tile] = -1;
    level[tile] = ground[tile];
    heap.push(tile, level[tile]);
  });
  const offsets = DX.map((dx, n) => dx * height + DY[n]);
  for (let count = 0; heap.size > 0; count++) {
    const tile = heap.pop();
    order[count] = tile;
    const x = Math.floor(tile / height);
    const y = tile - x * height;
    const inside = x > 0 && y > 0 && x < width - 1 && y < height - 1;
    for (let n = 0; n < 8; n++) {
      if (!inside && !onMap(x + DX[n], y + DY[n], width, height)) continue;
      const next = tile + offsets[n];
      if (reached[next]) continue;
      reached[next] = 1;
      drainsTo[next] = tile;
      distance[next] = DISTANCE[n];
      level[next] = Math.max(ground[next], level[tile]);
      heap.push(next, level[next]);
    }
  }
  return { drainsTo, distance, order };
}

/**
 * The level water stands at on each tile, flooding from the map's edges lowest first. Ground the
 * water already covers is flooded through a plain queue rather than the heap (Priority-Flood+), so
 * the flats of whole-level ground cost next to nothing.
 */
function spillLevels(ground: Float64Array, width: number, height: number): Float64Array {
  const tiles = width * height;
  const spill = new Float64Array(tiles);
  const reached = new Uint8Array(tiles);
  const heap = new TileHeap(tiles);
  const covered = new Int32Array(tiles);
  let head = 0;
  let tail = 0;
  forEachEdgeTile(width, height, (tile) => {
    reached[tile] = 1;
    spill[tile] = ground[tile];
    heap.push(tile, spill[tile]);
  });
  const offsets = DX.map((dx, n) => dx * height + DY[n]);
  while (head < tail || heap.size > 0) {
    const tile = head < tail ? covered[head++] : heap.pop();
    const x = Math.floor(tile / height);
    const y = tile - x * height;
    const inside = x > 0 && y > 0 && x < width - 1 && y < height - 1;
    for (let n = 0; n < 8; n++) {
      if (!inside && !onMap(x + DX[n], y + DY[n], width, height)) continue;
      const next = tile + offsets[n];
      if (reached[next]) continue;
      reached[next] = 1;
      if (ground[next] <= spill[tile]) {
        spill[next] = spill[tile];
        covered[tail++] = next;
      } else {
        spill[next] = ground[next];
        heap.push(next, spill[next]);
      }
    }
  }
  return spill;
}

function onMap(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function forEachEdgeTile(width: number, height: number, visit: (tile: number) => void) {
  for (let x = 0; x < width; x++)
    for (let y = 0; y < height; y++)
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) visit(x * height + y);
}

/** Binary min-heap of tiles, each with its key alongside so sifting reads one array. */
class TileHeap {
  private readonly tiles: Int32Array;
  private readonly keys: Float64Array;
  size = 0;

  constructor(capacity: number) {
    this.tiles = new Int32Array(capacity);
    this.keys = new Float64Array(capacity);
  }

  push(tile: number, key: number) {
    const { tiles, keys } = this;
    let i = this.size++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (keys[parent] <= key) break;
      tiles[i] = tiles[parent];
      keys[i] = keys[parent];
      i = parent;
    }
    tiles[i] = tile;
    keys[i] = key;
  }

  /** Takes out the tile with the lowest key. */
  pop(): number {
    const { tiles, keys } = this;
    const top = tiles[0];
    const size = --this.size;
    const last = tiles[size];
    const key = keys[size];
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      if (left >= size) break;
      const right = left + 1;
      const child = right < size && keys[right] < keys[left] ? right : left;
      if (keys[child] >= key) break;
      tiles[i] = tiles[child];
      keys[i] = keys[child];
      i = child;
    }
    tiles[i] = last;
    keys[i] = key;
    return top;
  }
}
