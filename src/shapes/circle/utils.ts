import { Circle } from "./circle";
import { CircleGroupCollision } from "./types";

/**
 * Checks for collisions between two groups of circles and returns pairs of colliding circles with their distances
 * @param groupA First array of circles
 * @param groupB Second array of circles
 * @returns Array of objects containing colliding circle pairs and the distance between their centers
 */
export function checkCircleGroupCollisions(groupA: Circle[], groupB: Circle[]) {
  const collisions: CircleGroupCollision[] = [];

  // Iterate through each pair of circles from both groups
  for (const circleA of groupA) {
    for (const circleB of groupB) {
      // Early rejection using bounding boxes
      const boxA = circleA.getBoundingBox();
      const boxB = circleB.getBoundingBox();
      if (
        boxA.minX > boxB.maxX ||
        boxA.maxX < boxB.minX ||
        boxA.minY > boxB.maxY ||
        boxA.maxY < boxB.minY
      ) {
        continue; // No collision possible
      }

      const collisionSquaredDistance =
        circleA.getCollisionSquaredDistance(circleB);

      // Check for collision using the collidesWith method
      if (collisionSquaredDistance !== null) {
        const distance = Math.sqrt(collisionSquaredDistance);
        const radiusA = circleA.radius; // Assuming Circle class has a radius property
        const radiusB = circleB.radius; // Assuming Circle class has a radius property

        const overlap = radiusA + radiusB - distance;
        const overlapProportion = overlap / (radiusA + radiusB); // Proportion of overlap relative to sum of radii

        collisions.push({
          circleA,
          circleB,
          distance,
          overlapProportion: overlapProportion > 0 ? overlapProportion : 0, // Ensure non-negative proportion
        });
      }
    }
  }

  return collisions;
}
