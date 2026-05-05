import {
  InstructionObjective,
  ObjectiveDto,
  Scenario,
} from "@lob-sdk/types";
import { getPosition } from "../utils";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";

export class ObjectiveExecutor {
  private random: () => number;

  constructor(
    private instruction: InstructionObjective,
    private scenario: Scenario,
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
    // TODO: validate `objectiveType` (must be ObjectiveType.Small | Big),
    // `team` (finite positive int), and `name` (length cap). Punted to a
    // future zod-based scenario validation pass that covers all instruction
    // executors uniformly — patching only this site is inconsistent.
    const { position, player, team, objectiveType, name } = this.instruction;

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
      ...(name !== undefined ? { name } : {}),
    });
  }
}
