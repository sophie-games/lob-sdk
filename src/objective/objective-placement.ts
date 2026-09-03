import { Point2 } from "@lob-sdk/vector";
import { EntityId } from "@lob-sdk/types";
import { BaseObjective } from "./base-objective";

type PlacedObjective = Pick<BaseObjective, "id" | "team" | "position">;

/**
 * Whether `position` lies closer than `spacing` to another objective owned by
 * the same `team`. The objective being placed is skipped via `excludeId`, and a
 * non-positive `spacing` disables the rule (always returns false). Shared by
 * server-side placement validation and client-side placement feedback so both
 * honor the same data-driven distance.
 */
export const isObjectivePositionTooClose = (
  position: Point2,
  objectives: ReadonlyArray<PlacedObjective>,
  spacing: number,
  excludeId: EntityId,
  team: number,
): boolean => {
  if (spacing <= 0) {
    return false;
  }

  return objectives.some(
    (objective) =>
      objective.id !== excludeId &&
      objective.team === team &&
      objective.position.distanceTo(position) < spacing,
  );
};

export interface ObjectiveSpacingPair {
  a: Pick<BaseObjective, "position">;
  b: Pick<BaseObjective, "position">;
  tooClose: boolean;
}

/**
 * All unordered pairs of the given objectives, each flagged as `tooClose` when
 * the two sit closer than `spacing`. A non-positive `spacing` flags nothing.
 * Callers pass a single team's objectives; used to draw the deployment
 * placement feedback lines with the same threshold the server enforces.
 */
export const getObjectiveSpacingPairs = (
  objectives: ReadonlyArray<Pick<BaseObjective, "position">>,
  spacing: number,
): ObjectiveSpacingPair[] => {
  const pairs: ObjectiveSpacingPair[] = [];

  for (let i = 0; i < objectives.length; i++) {
    for (let j = i + 1; j < objectives.length; j++) {
      const a = objectives[i];
      const b = objectives[j];
      const tooClose =
        spacing > 0 && a.position.distanceTo(b.position) < spacing;
      pairs.push({ a, b, tooClose });
    }
  }

  return pairs;
};
