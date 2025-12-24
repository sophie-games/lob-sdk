import { PositionData } from "@lob-sdk/types";
import { clamp, getRandomInt } from "@lob-sdk/utils";
import { Point2 } from "@lob-sdk/vector";

export const getPosition = (
  position: PositionData,
  width: number,
  height: number,
  randomFn?: () => number
): [number, number] => {
  switch (position.type) {
    case "exact": {
      const [percentageX, percentageY] = position.coords;

      const positionX = Math.floor(width * (percentageX / 100));
      const positionY = Math.floor(height * (percentageY / 100));

      return [positionX, positionY];
    }

    case "range": {
      const [minX, minY] = position.min;
      const [maxX, maxY] = position.max;

      const percentageX = getRandomInt(minX, maxX, randomFn);
      const percentageY = getRandomInt(minY, maxY, randomFn);

      const positionX = Math.floor(width * (percentageX / 100));
      const positionY = Math.floor(height * (percentageY / 100));

      return [positionX, positionY];
    }
  }
};

export function convertTo01Range(value: number): number {
  return clamp((value + 1) / 2, 0, 1);
}

export function getRandomEdgePoints(
  tilesX: number,
  tilesY: number,
  randomFn: () => number
): { start: Point2; end: Point2 } {
  // Helper function to get a random integer
  const randomInt = (min: number, max: number) =>
    getRandomInt(min, max, randomFn);

  // Helper function to get a random edge point with specified edge
  const getEdgePoint = (edge: number): Point2 => {
    switch (edge) {
      case 0: // top edge
        return { x: randomInt(0, tilesX - 1), y: 0 };
      case 1: // right edge
        return { x: tilesX - 1, y: randomInt(0, tilesY - 1) };
      case 2: // bottom edge
        return { x: randomInt(0, tilesX - 1), y: tilesY - 1 };
      default: // left edge (3)
        return { x: 0, y: randomInt(0, tilesY - 1) };
    }
  };

  // Get first random edge
  const startEdge = randomInt(0, 3);

  // Get second edge (ensuring it's different from the first)
  let endEdge = randomInt(0, 2);
  if (endEdge >= startEdge) endEdge++;

  const start = getEdgePoint(startEdge);
  const end = getEdgePoint(endEdge);

  return { start, end };
}
