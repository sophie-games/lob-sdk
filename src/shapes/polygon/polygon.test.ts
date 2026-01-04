import { Vector2 } from "@lob-sdk/vector";
import { Polygon } from "./polygon";

describe("Polygon", () => {
  describe("intersectsWithLine()", () => {
    it("should return the correct intersection point", () => {
      const start = new Vector2(1122, 1029);
      const end = new Vector2(781, 881);

      const polygon = new Polygon([
        { x: 883, y: 901 },
        { x: 862, y: 902 },
        { x: 866, y: 958 },
        { x: 891, y: 972 },
      ]);

      const intersectionPoint = polygon.intersectsWithLine(start, end);
      expect(intersectionPoint).toEqual(true);
    });
  });
});
