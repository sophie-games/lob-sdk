import { Circle } from "./circle";
import { Polygon } from "./polygon";
import { Rectangle } from "./rectangle";

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export enum ShapeType {
  Rectangle,
  Circle,
  Polygon,
}

export type Shape = Rectangle | Circle | Polygon;
