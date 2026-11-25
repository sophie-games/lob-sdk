import {
  getCollisionConfig,
  isCircleCollision,
  getFrontBackArc,
  getFlankAngles,
} from "./collision-config";
import { CollisionShapeType } from "./unit";

const obb = (frontage: number, depth: number) => ({
  collisionShape: { type: CollisionShapeType.Obb as const, frontage, depth },
});

describe("isCircleCollision", () => {
  it("distinguishes a circle from a rectangle by its type", () => {
    expect(
      isCircleCollision({ type: CollisionShapeType.Circle, radius: 16 }),
    ).toBe(true);
    expect(
      isCircleCollision({
        type: CollisionShapeType.Obb,
        frontage: 40,
        depth: 10,
      }),
    ).toBe(false);
  });
});

describe("getCollisionConfig", () => {
  it("returns the nested collisionShape field as-is", () => {
    expect(
      getCollisionConfig({
        collisionShape: {
          type: CollisionShapeType.Obb,
          frontage: 40,
          depth: 10,
        },
      }),
    ).toEqual({ type: CollisionShapeType.Obb, frontage: 40, depth: 10 });
    expect(
      getCollisionConfig({
        collisionShape: { type: CollisionShapeType.Circle, radius: 16 },
      }),
    ).toEqual({ type: CollisionShapeType.Circle, radius: 16 });
  });

  it("synthesises an Obb from legacy frontage/depth", () => {
    expect(getCollisionConfig({ frontage: 24, depth: 12 })).toEqual({
      type: CollisionShapeType.Obb,
      frontage: 24,
      depth: 12,
    });
  });

  it("synthesises a circle from a single legacy collision circle", () => {
    expect(
      getCollisionConfig({ collisionCircles: 1, collisionCircleSize: 32 }),
    ).toEqual({ type: CollisionShapeType.Circle, radius: 16 });
  });

  it("synthesises an Obb spanning a legacy multi-circle layout (matching old dimensions)", () => {
    // line: 4 circles of size 10 along the front -> 40 x 10.
    expect(
      getCollisionConfig({ collisionCircles: 4, collisionCircleSize: 10 }),
    ).toEqual({ type: CollisionShapeType.Obb, frontage: 40, depth: 10 });
    // column: 2 circles of size 12 arranged vertically -> 12 x 24.
    expect(
      getCollisionConfig({
        collisionCircles: 2,
        collisionCircleSize: 12,
        collisionCirclesVertical: true,
      }),
    ).toEqual({ type: CollisionShapeType.Obb, frontage: 12, depth: 24 });
  });

  it("maps a legacy no-collision formation (0 circles or 0 size) to a zero-radius circle", () => {
    expect(
      getCollisionConfig({ collisionCircles: 0, collisionCircleSize: 16 }),
    ).toEqual({ type: CollisionShapeType.Circle, radius: 0 });
    expect(
      getCollisionConfig({ collisionCircles: 2, collisionCircleSize: 0 }),
    ).toEqual({ type: CollisionShapeType.Circle, radius: 0 });
  });
});

describe("getFrontBackArc", () => {
  it("is the angle the front-face corners subtend, 2*atan2(frontage, depth)", () => {
    expect(getFrontBackArc(obb(16, 16))).toBeCloseTo(90); // square
    expect(getFrontBackArc(obb(24, 12))).toBeCloseTo(126.87, 1); // artillery
  });

  it("is wider for a shallow wide line than a deep narrow column", () => {
    expect(getFrontBackArc(obb(32, 8))).toBeGreaterThan(getFrontBackArc(obb(14, 14)));
    expect(getFrontBackArc(obb(14, 14))).toBeCloseTo(90); // 14x14 column
  });

  it("returns 360 for a circle (no facing -> every hit classifies as front)", () => {
    expect(
      getFrontBackArc({ collisionShape: { type: CollisionShapeType.Circle, radius: 8 } }),
    ).toBe(360);
  });
});

describe("getFlankAngles", () => {
  it("opens the flank ramp from arc/2 to 180 - arc/2", () => {
    const { min, max } = getFlankAngles(obb(16, 16)); // arc 90
    expect(min).toBeCloseTo(45);
    expect(max).toBeCloseTo(135);
  });

  it("protects a wide cone for a broad-front line (harder to flank head-on)", () => {
    const { min, max } = getFlankAngles(obb(32, 8)); // arc ~151.93
    expect(min).toBeCloseTo(75.96, 1);
    expect(max).toBeCloseTo(104.04, 1);
  });
});
