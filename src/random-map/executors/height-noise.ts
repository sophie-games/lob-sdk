import {
  ProceduralScenario,
  InstructionHeightNoise,
  TerrainType,
} from "@lob-sdk/types";
import { deriveSeed, randomSeeded } from "@lob-sdk/seed";
import {
  createNoise2D,
  NoiseFunction2D,
} from "@lob-sdk/simplex-noise";
import { clamp, getRandomFloat, setHeightRecursively } from "@lob-sdk/utils";

export class HeightNoiseExecutor {
  private noiseFns: NoiseFunction2D[];
  private randomFns: (() => number)[];
  private scalesX: number[] = [];
  private scalesY: number[] = [];

  constructor(
    private instruction: InstructionHeightNoise,
    private scenario: ProceduralScenario,
    private seed: number,
    private index: number,
    private terrains: TerrainType[][],
    private heightMap: number[][]
  ) {
    this.noiseFns = [];
    this.randomFns = [];

    const heightNoisesAmount = this.instruction.noises.length ?? 0;
    for (let i = 0; i < heightNoisesAmount; i++) {
      const noiseConfig = this.instruction.noises[i];
      const { scale } = noiseConfig;

      let scaleX: number;
      let scaleY: number;
      if (typeof scale === "number") {
        scaleX = scale;
        scaleY = scale;
      } else {
        scaleX = scale.x;
        scaleY = scale.y;
      }

      this.scalesX.push(scaleX);
      this.scalesY.push(scaleY);

      const random = randomSeeded(deriveSeed(seed, index + i));
      const noise = createNoise2D(random);

      this.randomFns.push(random);
      this.noiseFns.push(noise);
    }
  }

  execute() {
    const tilesX = this.terrains.length;
    const tilesY = this.terrains[0].length;

    // Generate terrain and height
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        this.setTileBaseHeight(x, y);
      }
    }
  }

  private setTileBaseHeight(x: number, y: number) {
    const { noiseFns, randomFns, heightMap } = this;

    if (noiseFns.length === 0) {
      console.warn(
        `[RandomMapGenerator] [setTileBaseHeight] heightNoises is empty`
      );
      return;
    }

    const { mergeStrategy, noises, min = 0, max, ranges } = this.instruction;

    // Check if current height is within the specified ranges
    if (ranges && ranges.length > 0) {
      const currentHeight = heightMap[x][y];

      let isInRange: boolean = false;
      for (const range of ranges) {
        if (currentHeight >= range.min && currentHeight <= range.max) {
          isInRange = true;
          break;
        }
      }

      if (!isInRange) {
        return; // Skip this tile if current height is not in any of the specified ranges
      }
    }

    let sum = 0;
    let count = noiseFns.length;
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let n = 0; n < count; n++) {
      const noiseFn = noiseFns[n];
      const randomFn = randomFns[n];
      const {
        multiplier = 1,
        offset = 0.0,
        randomness = 0.0,
        reversed = false,
      } = noises[n];

      let value =
        noiseFn(x / this.scalesX[n], y / this.scalesY[n]) * multiplier + offset;

      if (randomness > 0) {
        value += getRandomFloat(-randomness, randomness, randomFn);
      }

      // If reversed is true, invert the value (0.0 becomes 1.0, 1.0 becomes 0.0)
      if (reversed) {
        value = 1.0 - value;
      }

      sum += value;
      if (value < minVal) minVal = value;
      if (value > maxVal) maxVal = value;
    }

    let heightValue: number;
    switch (mergeStrategy) {
      case "avg":
        heightValue = sum / count;
        break;
      case "round":
        heightValue = Math.round(sum / count);
        break;
      case "max":
        heightValue = maxVal;
        break;
      case "min":
        heightValue = minVal;
        break;
      default:
        heightValue = minVal;
    }

    // Scale to your height range
    heightValue = Math.floor(heightValue * (max - min)) + min;
    heightValue = clamp(heightValue, min, max);

    setHeightRecursively(x | 0, y | 0, heightValue, heightMap);
  }
}
