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
    const { position, player, team, objectiveType } = this.instruction;

    const [positionX, positionY] = getPosition(
      position,
      widthPx,
      heightPx,
      random
    );

    objectives.push({
      pos: { x: positionX, y: positionY },
      player: player,
      ...(team !== undefined ? { team } : {}),
      ...(objectiveType !== undefined ? { type: objectiveType } : {}),
    });
  }
}
