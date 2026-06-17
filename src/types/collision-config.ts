import { CollisionShapeConfig, CollisionShapeType } from "./unit";

/**
 * The collision-related fields of a FormationTemplate, read by `getCollisionConfig`.
 * A FormationTemplate satisfies this structurally; the deprecated flat fields are
 * only consulted for older custom-scenario formations.
 */
export interface CollisionFields {
  collisionShape?: CollisionShapeConfig;
  /** @deprecated */ frontage?: number;
  /** @deprecated */ depth?: number;
  /** @deprecated */ collisionCircles?: number;
  /** @deprecated */ collisionCircleSize?: number;
  /** @deprecated */ collisionCircleDistance?: number;
  /** @deprecated */ collisionCirclesVertical?: boolean;
}

/** True when a collision config is a circle (rather than a rotated rectangle). */
export function isCircleCollision(
  config: CollisionShapeConfig,
): config is { type: CollisionShapeType.Circle; radius: number } {
  return config.type === CollisionShapeType.Circle;
}

/**
 * A formation's collision footprint, normalised to a CollisionShapeConfig. Prefers
 * the `collisionShape` field; for older custom-scenario formations that predate it,
 * synthesises one from the deprecated flat fields (frontage/depth, else the circle
 * layout). This is the single place that reads the legacy collision fields.
 */
export function getCollisionConfig(
  formation: CollisionFields,
): CollisionShapeConfig {
  if (formation.collisionShape) return formation.collisionShape;
  if (formation.frontage != null && formation.depth != null) {
    return {
      type: CollisionShapeType.Obb,
      frontage: formation.frontage,
      depth: formation.depth,
    };
  }
  // Legacy multi-circle layout: a single circle, or a rectangle spanning the circles
  // (so the derived dimensions match what the old layout produced).
  const size = formation.collisionCircleSize ?? 32;
  const count = formation.collisionCircles ?? 1;
  // legacy "no collision" (flying/ghost)
  if (count <= 0 || size <= 0) return { type: CollisionShapeType.Circle, radius: 0 };
  if (count <= 1) return { type: CollisionShapeType.Circle, radius: size / 2 };
  const distance = formation.collisionCircleDistance ?? size;
  const span = (count - 1) * distance + size;
  return formation.collisionCirclesVertical
    ? { type: CollisionShapeType.Obb, frontage: size, depth: span }
    : { type: CollisionShapeType.Obb, frontage: span, depth: size };
}
