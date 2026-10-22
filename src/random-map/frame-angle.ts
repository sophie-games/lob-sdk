import { Range } from "@lob-sdk/types";

/**
 * The frame a turned procedural map is generated in: a grid, turned by the angle about the map's
 * centre, large enough to cover the whole map. Instructions read their positions, ranges and
 * bounds in it, and draw straight onto the map at the turned place, so every feature is traced
 * at its angle rather than turned afterwards. The angle is in degrees, clockwise on screen.
 */
export class TurnedFrame {
  readonly cos: number;
  readonly sin: number;
  /** Size of the frame, in tiles. */
  readonly tilesX: number;
  readonly tilesY: number;

  constructor(
    readonly angle: number,
    readonly mapTilesX: number,
    readonly mapTilesY: number,
  ) {
    const radians = (angle * Math.PI) / 180;
    this.cos = Math.cos(radians);
    this.sin = Math.sin(radians);
    const c = Math.abs(this.cos);
    const s = Math.abs(this.sin);
    this.tilesX = Math.ceil(mapTilesX * c + mapTilesY * s);
    this.tilesY = Math.ceil(mapTilesX * s + mapTilesY * c);
  }

  /** Where frame point (fx, fy) lies on the map. */
  toMap(fx: number, fy: number): [number, number] {
    const dx = fx - (this.tilesX - 1) / 2;
    const dy = fy - (this.tilesY - 1) / 2;
    return [
      dx * this.cos - dy * this.sin + (this.mapTilesX - 1) / 2,
      dx * this.sin + dy * this.cos + (this.mapTilesY - 1) / 2,
    ];
  }

  /** Where map point (mx, my) lies in the frame. */
  toFrame(mx: number, my: number): [number, number] {
    const dx = mx - (this.mapTilesX - 1) / 2;
    const dy = my - (this.mapTilesY - 1) / 2;
    return [
      dx * this.cos + dy * this.sin + (this.tilesX - 1) / 2,
      -dx * this.sin + dy * this.cos + (this.tilesY - 1) / 2,
    ];
  }

  /**
   * The part of the frame an instruction works in: all of it, or the rectangle its bounds cut,
   * which is what a bounded instruction treats as its edges.
   */
  area(xBounds?: Range, yBounds?: Range): InstructionArea {
    if (!xBounds || !yBounds) return new InstructionArea(this, 0, 0, this.tilesX, this.tilesY);
    const x0 = Math.floor((xBounds.min / 100) * this.tilesX);
    const x1 = Math.floor((xBounds.max / 100) * this.tilesX);
    const y0 = Math.floor((yBounds.min / 100) * this.tilesY);
    const y1 = Math.floor((yBounds.max / 100) * this.tilesY);
    return new InstructionArea(this, x0, y0, x1 - x0, y1 - y0);
  }
}

/**
 * An instruction's own grid, in the turned frame: `tilesX` by `tilesY` local tiles whose origin
 * is (x0, y0) in the frame. Positions and percentages are read in it; drawing lands on the map.
 */
export class InstructionArea {
  constructor(
    private readonly frame: TurnedFrame,
    private readonly x0: number,
    private readonly y0: number,
    readonly tilesX: number,
    readonly tilesY: number,
  ) {}

  get angle(): number {
    return this.frame.angle;
  }

  /** Where local point (u, v) lies on the map. */
  toMap(u: number, v: number): [number, number] {
    return this.frame.toMap(u + this.x0, v + this.y0);
  }

  /** Where map point (mx, my) lies in local coordinates. */
  local(mx: number, my: number): [number, number] {
    const [fx, fy] = this.frame.toFrame(mx, my);
    return [fx - this.x0, fy - this.y0];
  }

  /** The map tile local point (u, v) falls on, or null off the map. */
  mapTile(u: number, v: number): [number, number] | null {
    const [mx, my] = this.toMap(u, v);
    const x = Math.round(mx);
    const y = Math.round(my);
    if (x < 0 || y < 0 || x >= this.frame.mapTilesX || y >= this.frame.mapTilesY) return null;
    return [x, y];
  }

  /** Whether map tile (mx, my) lies inside this area. */
  contains(mx: number, my: number): boolean {
    const [u, v] = this.local(mx, my);
    const iu = Math.round(u);
    const iv = Math.round(v);
    return iu >= 0 && iv >= 0 && iu < this.tilesX && iv < this.tilesY;
  }

  /** Every map tile inside this area, with its local coordinates. */
  *tiles(): Generator<[number, number, number, number]> {
    for (let mx = 0; mx < this.frame.mapTilesX; mx++)
      for (let my = 0; my < this.frame.mapTilesY; my++) {
        const [u, v] = this.local(mx, my);
        const iu = Math.round(u);
        const iv = Math.round(v);
        if (iu >= 0 && iv >= 0 && iu < this.tilesX && iv < this.tilesY) yield [mx, my, u, v];
      }
  }
}
