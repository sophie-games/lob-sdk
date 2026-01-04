import { Circle } from "./circle";

export interface CircleGroupCollision {
  circleA: Circle;
  circleB: Circle;
  distance: number;
  overlapProportion: number;
}
