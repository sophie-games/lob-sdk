import { GenerateRandomMapProps, GenerateRandomMapResult } from "@lob-sdk/types";
import { resolveMapSizing } from "./resolve-map-sizing";
import { SizedMapGenerator } from "./sized-map-generator";

export class RandomMapGenerator {
  generate(props: GenerateRandomMapProps): GenerateRandomMapResult {
    return new SizedMapGenerator().generate(props, resolveMapSizing(props));
  }
}
