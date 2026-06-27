import { Vector2 } from "@lob-sdk/vector";
import {
  isObjectivePositionTooClose,
  getObjectiveSpacingPairs,
} from "./objective-placement";

const objectiveAt = (id: number, team: number, x: number, y: number) => ({
  id,
  team,
  position: new Vector2(x, y),
});

describe("isObjectivePositionTooClose", () => {
  it("returns false when spacing is zero (rule disabled)", () => {
    const objectives = [objectiveAt(1, 0, 0, 0)];
    expect(
      isObjectivePositionTooClose(new Vector2(1, 0), objectives, 0, 99, 0),
    ).toBe(false);
  });

  it("returns false when no same-team objective is within spacing", () => {
    const objectives = [objectiveAt(1, 0, 0, 0), objectiveAt(2, 0, 500, 0)];
    expect(
      isObjectivePositionTooClose(new Vector2(250, 0), objectives, 100, 99, 0),
    ).toBe(false);
  });

  it("returns true when a same-team objective is within spacing", () => {
    const objectives = [objectiveAt(1, 0, 0, 0)];
    expect(
      isObjectivePositionTooClose(new Vector2(50, 0), objectives, 100, 99, 0),
    ).toBe(true);
  });

  it("ignores objectives owned by another team", () => {
    const objectives = [objectiveAt(1, 1, 0, 0)];
    expect(
      isObjectivePositionTooClose(new Vector2(50, 0), objectives, 100, 99, 0),
    ).toBe(false);
  });

  it("ignores the objective being placed (excludeId)", () => {
    const objectives = [objectiveAt(1, 0, 0, 0)];
    expect(
      isObjectivePositionTooClose(new Vector2(10, 0), objectives, 100, 1, 0),
    ).toBe(false);
  });

  it("allows a position exactly at the spacing distance (strict less-than)", () => {
    const objectives = [objectiveAt(1, 0, 0, 0)];
    expect(
      isObjectivePositionTooClose(new Vector2(100, 0), objectives, 100, 99, 0),
    ).toBe(false);
  });
});

describe("getObjectiveSpacingPairs", () => {
  it("returns no pairs for fewer than two objectives", () => {
    expect(getObjectiveSpacingPairs([], 100)).toEqual([]);
    expect(getObjectiveSpacingPairs([objectiveAt(1, 0, 0, 0)], 100)).toEqual(
      [],
    );
  });

  it("returns one pair per unordered combination", () => {
    const objectives = [
      objectiveAt(1, 0, 0, 0),
      objectiveAt(2, 0, 1000, 0),
      objectiveAt(3, 0, 0, 1000),
    ];
    expect(getObjectiveSpacingPairs(objectives, 100)).toHaveLength(3);
  });

  it("flags a pair closer than spacing", () => {
    const objectives = [objectiveAt(1, 0, 0, 0), objectiveAt(2, 0, 50, 0)];
    expect(getObjectiveSpacingPairs(objectives, 100)[0].tooClose).toBe(true);
  });

  it("does not flag a pair at or beyond spacing", () => {
    const objectives = [objectiveAt(1, 0, 0, 0), objectiveAt(2, 0, 100, 0)];
    expect(getObjectiveSpacingPairs(objectives, 100)[0].tooClose).toBe(false);
  });

  it("flags nothing when spacing is zero", () => {
    const objectives = [objectiveAt(1, 0, 0, 0), objectiveAt(2, 0, 5, 0)];
    expect(getObjectiveSpacingPairs(objectives, 0)[0].tooClose).toBe(false);
  });
});
