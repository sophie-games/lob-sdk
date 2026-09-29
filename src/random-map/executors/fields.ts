import { InstructionFields, TerrainType } from "@lob-sdk/types";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";

/** Grass left unsown along the road itself. */
const VERGE = 1;
/** How far around a road tile its direction is measured. */
const DIRECTION_RADIUS = 3;
/** Strip directions are rounded to this many steps over half a turn, so field edges run straight. */
const DIRECTION_STEPS = 8;

const NEIGHBOURS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
] as const;

/**
 * Lays out fields in strips along the roads (see {@link InstructionFields}). Every grass tile
 * within reach takes the direction of its nearest road tile; its distance from the road picks
 * the strip across, and its position along that direction the strip's length. Each strip is one
 * parcel, sown with a crop none of its neighbours has, or left as meadow; slivers stay meadow.
 */
export class FieldsExecutor {
  private readonly random: () => number;
  private readonly tilesX: number;
  private readonly tilesY: number;

  constructor(
    private readonly instruction: InstructionFields,
    seed: number,
    index: number,
    private readonly terrains: TerrainType[][],
    private readonly heightMap: number[][],
  ) {
    this.random = randomSeeded(deriveSeed(seed, index + 1));
    this.tilesX = terrains.length;
    this.tilesY = terrains[0].length;
  }

  execute(): void {
    const { instruction, terrains, heightMap, tilesX, tilesY } = this;
    const { maxDistance, heights, border } = instruction;
    const along = new Set(instruction.along ?? [TerrainType.Road]);
    const { dist, source } = this.distances(along, maxDistance);
    const road = this.roads(along);

    // Strip edges across the road, and each strip's length and phase along it.
    const edges = [VERGE + 1];
    while (edges[edges.length - 1] <= maxDistance) edges.push(edges[edges.length - 1] + this.int(instruction.width));
    const lengths = edges.map(() => this.int(instruction.size));
    const phases = lengths.map((length) => this.random() * length);

    const directions = new Map<number, number>();
    const parcelOf = new Int32Array(tilesX * tilesY).fill(-1);
    const rowTile = new Uint8Array(tilesX * tilesY);
    const keys = new Map<string, number>();

    for (let x = 0; x < tilesX; x++)
      for (let y = 0; y < tilesY; y++) {
        const i = x * tilesY + y;
        const d = dist[i];
        if (d < VERGE + 1 || d > maxDistance || terrains[x][y] !== TerrainType.Grass) continue;
        if (heights && !heights.some((r) => heightMap[x][y] >= r.min && heightMap[x][y] <= r.max)) continue;

        const s = source[i];
        const sx = Math.floor(s / tilesY);
        const sy = s % tilesY;
        let step = directions.get(s);
        if (step === undefined) {
          step = this.direction(sx, sy, along);
          directions.set(s, step);
        }
        const angle = (step * Math.PI) / DIRECTION_STEPS;
        const ux = Math.cos(angle);
        const uy = Math.sin(angle);
        const cross = ux * (y - sy) - uy * (x - sx);
        const side = cross > 0.01 ? 1 : cross < -0.01 ? -1 : 0;

        let band = 0;
        while (edges[band + 1] <= d) band++;
        const segment = Math.floor((x * ux + y * uy + phases[band]) / lengths[band]);
        const key = `${road[s]}|${step}|${side}|${band}|${segment}`;
        let parcel = keys.get(key);
        if (parcel === undefined) {
          parcel = keys.size;
          keys.set(key, parcel);
        }
        parcelOf[i] = parcel;
        if (band > 0 && d === edges[band]) rowTile[i] = 1;
      }

    const crops = this.sowParcels(keys.size, parcelOf);
    const rowDrawn = Array.from({ length: keys.size }, () => !!border && this.random() < border.chance);

    for (let x = 0; x < tilesX; x++)
      for (let y = 0; y < tilesY; y++) {
        const i = x * tilesY + y;
        const parcel = parcelOf[i];
        if (parcel < 0) continue;
        if (rowTile[i] && rowDrawn[parcel]) terrains[x][y] = border!.terrain;
        else if (crops[parcel] !== null) terrains[x][y] = crops[parcel]!;
      }
  }

  /** Distance from the nearest `along` tile, in 8-connected steps, and which tile that is. */
  private distances(along: Set<TerrainType>, maxDistance: number) {
    const { terrains, tilesX, tilesY } = this;
    const dist = new Int32Array(tilesX * tilesY).fill(-1);
    const source = new Int32Array(tilesX * tilesY).fill(-1);
    let queue: number[] = [];
    for (let x = 0; x < tilesX; x++)
      for (let y = 0; y < tilesY; y++)
        if (along.has(terrains[x][y])) {
          const i = x * tilesY + y;
          dist[i] = 0;
          source[i] = i;
          queue.push(i);
        }
    for (let d = 1; d <= maxDistance && queue.length; d++) {
      const next: number[] = [];
      for (const i of queue) {
        const x = Math.floor(i / tilesY);
        const y = i % tilesY;
        for (const [dx, dy] of NEIGHBOURS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= tilesX || ny >= tilesY) continue;
          const n = nx * tilesY + ny;
          if (dist[n] !== -1) continue;
          dist[n] = d;
          source[n] = source[i];
          next.push(n);
        }
      }
      queue = next;
    }
    return { dist, source };
  }

  /** Which connected road each `along` tile belongs to, so strips beside two roads stay apart. */
  private roads(along: Set<TerrainType>): Int32Array {
    const { terrains, tilesX, tilesY } = this;
    const road = new Int32Array(tilesX * tilesY).fill(-1);
    let count = 0;
    for (let x = 0; x < tilesX; x++)
      for (let y = 0; y < tilesY; y++) {
        const start = x * tilesY + y;
        if (road[start] !== -1 || !along.has(terrains[x][y])) continue;
        road[start] = count;
        const stack = [start];
        while (stack.length) {
          const i = stack.pop()!;
          const cx = Math.floor(i / tilesY);
          const cy = i % tilesY;
          for (const [dx, dy] of NEIGHBOURS) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= tilesX || ny >= tilesY) continue;
            const n = nx * tilesY + ny;
            if (road[n] === -1 && along.has(terrains[nx][ny])) {
              road[n] = count;
              stack.push(n);
            }
          }
        }
        count++;
      }
    return road;
  }

  /** The road's direction at (x, y), as one of DIRECTION_STEPS steps over half a turn. */
  private direction(x: number, y: number, along: Set<TerrainType>): number {
    let cxx = 0;
    let cyy = 0;
    let cxy = 0;
    for (let dx = -DIRECTION_RADIUS; dx <= DIRECTION_RADIUS; dx++)
      for (let dy = -DIRECTION_RADIUS; dy <= DIRECTION_RADIUS; dy++)
        if (along.has(this.terrains[x + dx]?.[y + dy])) {
          cxx += dx * dx;
          cyy += dy * dy;
          cxy += dx * dy;
        }
    const angle = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    const steps = Math.round((angle * DIRECTION_STEPS) / Math.PI);
    return ((steps % DIRECTION_STEPS) + DIRECTION_STEPS) % DIRECTION_STEPS;
  }

  /**
   * A crop for each parcel, or null for meadow. A parcel takes a crop none of its sown neighbours
   * has, and stays meadow when there is none left, so two strips never merge into one field.
   */
  private sowParcels(count: number, parcelOf: Int32Array): (TerrainType | null)[] {
    const { tilesX, tilesY, instruction } = this;
    const neighbours = Array.from({ length: count }, () => new Set<number>());
    for (let x = 0; x < tilesX; x++)
      for (let y = 0; y < tilesY; y++) {
        const a = parcelOf[x * tilesY + y];
        if (a < 0) continue;
        for (const [nx, ny] of [[x + 1, y], [x, y + 1]])
          if (nx < tilesX && ny < tilesY) {
            const b = parcelOf[nx * tilesY + ny];
            if (b >= 0 && b !== a) {
              neighbours[a].add(b);
              neighbours[b].add(a);
            }
          }
      }
    // A sliver left where a strip is cut short stays meadow rather than read as a field.
    const tiles = new Int32Array(count);
    for (const parcel of parcelOf) if (parcel >= 0) tiles[parcel]++;
    const smallest = Math.ceil((instruction.width.min * instruction.size.min) / 2);
    const crops: (TerrainType | null)[] = Array(count).fill(null);
    for (let p = 0; p < count; p++) {
      if (this.random() >= instruction.chance || tiles[p] < smallest) continue;
      const taken = new Set([...neighbours[p]].map((n) => crops[n]));
      const free = instruction.terrains.filter((t) => !taken.has(t));
      if (free.length) crops[p] = free[Math.floor(this.random() * free.length)];
    }
    return crops;
  }

  private int(range: { min: number; max: number }): number {
    return range.min + Math.floor(this.random() * (range.max - range.min + 1));
  }
}
