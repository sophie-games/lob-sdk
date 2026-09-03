import { ObbShape, fireEdgeRegionPolygon } from "./collision-shape";

// A square centred at (cx, cy) with half-size h, in OBB corner order.
const square = (cx: number, cy: number, h: number) =>
  new ObbShape([
    { x: cx - h, y: cy - h },
    { x: cx + h, y: cy - h },
    { x: cx + h, y: cy + h },
    { x: cx - h, y: cy + h },
  ]);

describe("fireEdgeRegionPolygon", () => {
  it.each([Math.PI / 4, 0])(
    "does not repeat points in a degenerate one-emitter cone (half arc %s)",
    (halfArc) => {
      const points = fireEdgeRegionPolygon(
        { x: 5, y: 0 },
        { x: 5, y: 0 },
        1,
        0,
        halfArc,
        100,
      );

      for (let i = 2; i < points.length; i += 2) {
        expect([points[i], points[i + 1]]).not.toEqual([
          points[i - 2],
          points[i - 1],
        ]);
      }
    },
  );
});

describe("ObbShape", () => {
  it("bounds a rectangle by its half-diagonal", () => {
    const s = square(0, 0, 5);
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

describe("distanceTo (edge-to-edge gap, 0 when touching/overlapping)", () => {
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

  it("obb-obb gap is the clear space between the boxes", () => {
    // Two 10-wide squares (half-size 5) centres 20 apart on X: 20 - 5 - 5 = 10 gap.
    const a = square(0, 0, 5);
    expect(a.distanceTo(square(20, 0, 5))).toBeCloseTo(10);
    expect(a.distanceTo(square(10, 0, 5))).toBeCloseTo(0); // edges touching
    expect(a.distanceTo(square(4, 0, 5))).toBe(0); // overlapping
    expect(a.distanceTo(square(0, 0, 5))).toBe(0); // identical
  });

  it("obb-obb gap uses the nearest corner on a diagonal offset", () => {
    // Squares at (0,0) and (20,20), both half-size 5. Nearest corners are
    // (5,5) and (15,15): gap = hypot(10,10) = 14.142.
    const a = square(0, 0, 5);
    expect(a.distanceTo(square(20, 20, 5))).toBeCloseTo(Math.hypot(10, 10));
  });

  it("is symmetric and handles rotation", () => {
    const a = square(0, 0, 5);
    const diamond = rotatedSquare(20, 0, 5, Math.PI / 4);
    // Diamond's near vertex points at the square: at x = 20 - 5*sqrt(2) ~= 12.93,
    // square's near edge at x=5, so gap ~= 7.93.
    expect(a.distanceTo(diamond)).toBeCloseTo(20 - 5 * Math.SQRT2 - 5);
    expect(a.distanceTo(diamond)).toBeCloseTo(diamond.distanceTo(a), 5);
  });
});
