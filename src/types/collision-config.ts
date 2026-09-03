import { CollisionShapeConfig, CollisionShapeType } from "./unit";

interface LegacyCircleCollisionShapeConfig {
  type: 0;
  radius: number;
}

/**
 * The collision-related fields of a FormationTemplate, read by `getCollisionConfig`.
 * A FormationTemplate satisfies this structurally; the deprecated flat fields are
 * only consulted for older custom-scenario formations.
 */
export interface CollisionFields {
  collisionShape?: CollisionShapeConfig | LegacyCircleCollisionShapeConfig;
  /** @deprecated */ frontage?: number;
  /** @deprecated */ depth?: number;
  /** @deprecated */ collisionCircles?: number;
  /** @deprecated */ collisionCircleSize?: number;
  /** @deprecated */ collisionCircleDistance?: number;
  /** @deprecated */ collisionCirclesVertical?: boolean;
}

/**
 * A formation's rotated-rectangle collision footprint. Legacy radius configs become
 * equal-diameter square OBBs, while older flat circle layouts become the rectangle
 * spanning their configured circles. This is the single place that reads legacy
 * collision fields.
 */
export function getCollisionConfig(
  formation: CollisionFields,
): CollisionShapeConfig {
  if (formation.collisionShape) {
    if (formation.collisionShape.type === 0) {
      const diameter = formation.collisionShape.radius * 2;
      return {
        type: CollisionShapeType.Obb,
        frontage: diameter,
        depth: diameter,
      };
    }
    return formation.collisionShape;
  }
  if (formation.frontage != null && formation.depth != null) {
    return {
      type: CollisionShapeType.Obb,
      frontage: formation.frontage,
      depth: formation.depth,
    };
  }
  // Legacy multi-circle layout: use the rectangle spanning the circles so the
  // derived dimensions match what the old layout produced.
  const size = formation.collisionCircleSize ?? 32;
  const count = formation.collisionCircles ?? 1;
  // Legacy "no collision" (flying/ghost).
  if (count <= 0 || size <= 0) {
    return { type: CollisionShapeType.Obb, frontage: 0, depth: 0 };
  }
  if (count <= 1) {
    return { type: CollisionShapeType.Obb, frontage: size, depth: size };
  }
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
 * (a column) a slim one.
 */
export function getFrontBackArc(formation: CollisionFields): number {
  const config = getCollisionConfig(formation);
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
