import { GameDataManager } from "@lob-sdk/game-data-manager";
import { GenerateRandomMapProps, InstructionType, Scenario, TerrainType } from "@lob-sdk/types";
import { RandomMapGenerator, resolveMapSizing } from "./random-map-generator";
import { SizedMapGenerator } from "./sized-map-generator";

const scenario = {
  name: "sized",
  instructions: [
    { type: InstructionType.HeightNoise, noises: [{ scale: 12 }], min: 0, max: 6 },
    { type: InstructionType.TerrainNoise, terrain: TerrainType.Forest, scale: 8, ranges: [{ min: 0.6, max: 1 }] },
  ],
} as unknown as Scenario;

const props: GenerateRandomMapProps = {
  scenario,
  dynamicBattleType: null,
  maxPlayers: 2,
  seed: 11,
  tileSize: GameDataManager.get("napoleonic").getGameConstants().TILE_SIZE,
  era: "napoleonic",
};

describe("SizedMapGenerator", () => {
  it("generates what RandomMapGenerator does, given the sizing it resolves", () => {
    expect(new SizedMapGenerator().generate(props, resolveMapSizing(props))).toEqual(
      new RandomMapGenerator().generate(props),
    );
  });

  it("resolves the battle size from the battle type and player count, or the caller's override", () => {
    const sizing = resolveMapSizing({ ...props, mapSize: "xl" as never });
    expect(sizing.battleSize).toBe("xl");
    expect(sizing.mapSizes.xl.map.tilesX).toBeGreaterThan(0);
  });
});
