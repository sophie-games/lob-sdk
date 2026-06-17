import {
  segmentCircleCoverage,
  coveredFraction,
  freeIntervals,
} from "./segment-coverage";
import { Point2 } from "@lob-sdk/vector";

const P = (x: number, y: number): Point2 => ({ x, y });

describe("segment-coverage", () => {
  describe("segmentCircleCoverage", () => {
    const a = P(0, 0);
    const b = P(10, 0);

    it("covers the chord under a circle centred on the segment", () => {
      // circle at (5,0) r=2 -> x in [3,7] -> t in [0.3,0.7]
      expect(segmentCircleCoverage(a, b, 5, 0, 2)).toEqual([0.3, 0.7]);
    });

    it("clamps to the segment ends", () => {
      // circle at (0,0) r=2 -> t in [0,0.2]
      expect(segmentCircleCoverage(a, b, 0, 0, 2)).toEqual([0, 0.2]);
    });

    it("returns null when the circle is too far (perp distance)", () => {
      expect(segmentCircleCoverage(a, b, 5, 3, 2)).toBeNull();
    });

    it("returns null when the circle is past the segment", () => {
      expect(segmentCircleCoverage(a, b, 20, 0, 2)).toBeNull();
    });
  });

  describe("interval helpers", () => {
    it("coveredFraction sums the merged union of overlapping intervals", () => {
      expect(
        coveredFraction([
          [0.1, 0.3],
          [0.2, 0.5],
          [0.7, 0.9],
        ]),
      ).toBeCloseTo(0.6); // (0.5-0.1) + (0.9-0.7)
    });

    it("freeIntervals are the gaps", () => {
      expect(freeIntervals([[0.2, 0.6]])).toEqual([
        [0, 0.2],
        [0.6, 1],
      ]);
    });

    it("full coverage leaves no free intervals", () => {
      expect(freeIntervals([[0, 1]])).toEqual([]);
    });

    it("does not mutate the input intervals", () => {
      const input: [number, number][] = [
        [0.2, 0.5],
        [0.1, 0.3],
      ];
      coveredFraction(input);
      expect(input).toEqual([
        [0.2, 0.5],
        [0.1, 0.3],
      ]);
    });
  });
});
