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

/**
 * The full front (and symmetric back) arc width in DEGREES, derived from the OBB
 * footprint: the angle the front-face corners subtend at the centre, `2*atan2(frontage,
 * depth)`. A wide, shallow formation (a line) gets a broad front cone; a deep, narrow one
 * (a column) a slim one. Circles have no facing, so the whole 360 is "front" - returning
 * 360 makes `getDirectionToPoint` classify every hit as Front (no rear/flank direction).
 */
export function getFrontBackArc(formation: CollisionFields): number {
  const config = getCollisionConfig(formation);
  if (isCircleCollision(config)) return 360;
  return (2 * Math.atan2(config.frontage, config.depth) * 180) / Math.PI;
}

/**
 * The flank ramp (DEGREES) derived from the front arc, for `getFlankingPercent`. Flanking
 * is null within the front face (attack angle off the front `<= arc/2`), ramps across the
 * exposed sides, and is full once the rear face begins (`>= 180 - arc/2`). So a broad-front
 * line is hard to flank head-on but fully exposed to its sides/rear, a deep column ramps
 * from almost any off-axis angle. Unflankable formations are short-circuited before this.
 */
export function getFlankAngles(formation: CollisionFields): {
  min: number;
  max: number;
} {
  const arc = getFrontBackArc(formation);
  return { min: arc / 2, max: 180 - arc / 2 };
}
