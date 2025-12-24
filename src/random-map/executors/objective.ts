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
    private width: number,
    private height: number,
    private objectives: ObjectiveDto<false>[]
  ) {
    this.random = randomSeeded(deriveSeed(seed, index + 1));
  }

  execute() {
    const { width, height, objectives, random } = this;
    const { position, player } = this.instruction;

    const [positionX, positionY] = getPosition(position, width, height, random);

    objectives.push({
      pos: { x: positionX, y: positionY },
      player: player,
    });
  }
}
