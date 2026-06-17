import { ObbShape, CircleShape } from "./collision-shape";
import { ShapeType } from "../types";

// A square centred at (cx, cy) with half-size h, in OBB corner order.
const square = (cx: number, cy: number, h: number) =>
  new ObbShape([
    { x: cx - h, y: cy - h },
    { x: cx + h, y: cy - h },
    { x: cx + h, y: cy + h },
    { x: cx - h, y: cy + h },
  ]);

describe("CircleShape", () => {
  it("tags itself a circle and reports its radius as the bounding radius", () => {
    const c = new CircleShape({ x: 0, y: 0 }, 5);
    expect(c.shapeType).toBe(ShapeType.Circle);
    expect(c.boundingRadius()).toBe(5);
  });

  it("circle-circle overlap is exact", () => {
    const a = new CircleShape({ x: 0, y: 0 }, 5);
    expect(a.overlapRatio(new CircleShape({ x: 100, y: 0 }, 5))).toBe(0); // disjoint
    expect(a.overlapRatio(new CircleShape({ x: 0, y: 0 }, 5))).toBe(1); // identical
    // Smaller fully inside the larger -> 1 (fraction of the smaller).
    const big = new CircleShape({ x: 0, y: 0 }, 10);
    expect(big.overlapRatio(new CircleShape({ x: 0, y: 0 }, 5))).toBe(1);
    // Two equal r=5 circles at distance 5: lens / (pi r^2) ~= 0.391.
    expect(a.overlapRatio(new CircleShape({ x: 5, y: 0 }, 5))).toBeCloseTo(0.391, 2);
  });

  it("a zero-radius (no-collision) circle overlaps nothing", () => {
    const ghost = new CircleShape({ x: 0, y: 0 }, 0);
    expect(ghost.overlapRatio(new CircleShape({ x: 0, y: 0 }, 5))).toBe(0);
    expect(ghost.overlapRatio(square(0, 0, 10))).toBe(0);
  });
});

describe("ObbShape", () => {
  it("tags itself a rectangle and bounds by the half-diagonal", () => {
    const s = square(0, 0, 5);
    expect(s.shapeType).toBe(ShapeType.Rectangle);
    expect(s.boundingRadius()).toBeCloseTo(Math.hypot(5, 5));
  });

  it("obb-obb overlap is the area fraction", () => {
    const a = square(0, 0, 5);
    expect(a.overlapRatio(square(0, 0, 5))).toBeCloseTo(1);
    expect(a.overlapRatio(square(100, 0, 5))).toBe(0);
  });
});

describe("rotated ObbShape overlap (exercises the non-axis-aligned clip path)", () => {
  const rotatedSquare = (cx: number, cy: number, h: number, angle: number) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const local = [
      { x: -h, y: -h },
      { x: h, y: -h },
      { x: h, y: h },
      { x: -h, y: h },
    ];
    return new ObbShape(
      local.map((p) => ({
        x: cx + p.x * cos - p.y * sin,
        y: cy + p.x * sin + p.y * cos,
      })),
    );
  };

  it("two identical 45deg squares fully overlap", () => {
    const a = rotatedSquare(0, 0, 5, Math.PI / 4);
    expect(a.overlapRatio(rotatedSquare(0, 0, 5, Math.PI / 4))).toBeCloseTo(1);
  });

  it("a rotated square far away does not overlap", () => {
    const a = rotatedSquare(0, 0, 5, Math.PI / 4);
    expect(a.overlapRatio(rotatedSquare(100, 0, 5, Math.PI / 6))).toBe(0);
  });

  it("a 45deg diamond straddling an axis-aligned square is a symmetric fraction in (0,1)", () => {
    const aligned = square(0, 0, 5);
    const diamond = rotatedSquare(6, 0, 5, Math.PI / 4);
    const ratio = aligned.overlapRatio(diamond);
    expect(ratio).toBeCloseTo(diamond.overlapRatio(aligned), 5);
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(1);
  });
});

describe("mixed circle / obb overlap (keeps the circle exact)", () => {
  it("is 1 when the smaller circle sits inside the rectangle", () => {
    const rect = square(0, 0, 50);
    const circle = new CircleShape({ x: 0, y: 0 }, 5);
    expect(rect.overlapRatio(circle)).toBeCloseTo(1, 1);
    expect(circle.overlapRatio(rect)).toBeCloseTo(1, 1);
  });

  it("is 0 when they are apart, and symmetric otherwise", () => {
    const rect = square(0, 0, 10);
    expect(rect.overlapRatio(new CircleShape({ x: 100, y: 0 }, 5))).toBe(0);
    // Partial overlap: the circle straddles the rectangle's right edge.
    const circle = new CircleShape({ x: 10, y: 0 }, 6);
    expect(rect.overlapRatio(circle)).toBeCloseTo(circle.overlapRatio(rect), 5);
    expect(rect.overlapRatio(circle)).toBeGreaterThan(0);
    expect(rect.overlapRatio(circle)).toBeLessThan(1);
  });
});
