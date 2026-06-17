import { getCollisionConfig, isCircleCollision } from "./collision-config";
import { CollisionShapeType } from "./unit";

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
