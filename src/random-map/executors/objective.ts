import {
  InstructionObjective,
  ObjectiveDto,
  ProceduralScenario,
} from "@lob-sdk/types";
import { getPosition } from "../utils";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";

export class ObjectiveExecutor {
  private random: () => number;

  constructor(
    private instruction: InstructionObjective,
    private scenario: ProceduralScenario,
    private seed: number,
    private index: number,
    private widthPx: number,
    private heightPx: number,
    private objectives: ObjectiveDto<false>[]
  ) {
    this.random = randomSeeded(deriveSeed(seed, index + 1));
  }

  execute() {
    const { widthPx, heightPx, objectives, random } = this;
    const { position, player } = this.instruction;

    const [positionX, positionY] = getPosition(
      position,
      widthPx,
      heightPx,
      random
    );

    // Clamp objectives to ensure they stay within map bounds
    // Objectives have a radius, so we need to leave some margin
    const objectiveRadius = 32; // Approximate radius of an objective
    const clampedX = Math.max(
      objectiveRadius,
      Math.min(positionX, widthPx - objectiveRadius)
    );
    const clampedY = Math.max(
      objectiveRadius,
      Math.min(positionY, heightPx - objectiveRadius)
    );

    objectives.push({
      pos: { x: clampedX, y: clampedY },
      player: player,
    });
  }
}
