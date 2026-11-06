import { limitSlopes } from "./slopes";

describe("limitSlopes", () => {
  it.each([
    [1, 1],
    [4, 4],
  ])("lowers a tile to at most %i levels above its lowest neighbour", (step, expected) => {
    const heightMap = Array.from({ length: 3 }, () => [0, 0, 0]);
    heightMap[1][1] = 9;
    limitSlopes(heightMap, step);
    expect(heightMap[1][1]).toBe(expected);
  });

  it("leaves a slope within the step alone", () => {
    const heightMap = [[0], [4], [8]];
    limitSlopes(heightMap, 4);
    expect(heightMap).toEqual([[0], [4], [8]]);
  });
});
