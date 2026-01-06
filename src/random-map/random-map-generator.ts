import { getDeploymentZoneBySize, getMapSizeIndex } from "./map-size";
import { Size } from "@lob-sdk/types";
import {
  ObjectiveDto,
  TeamDeploymentZone,
  GenerateRandomMapResult,
  GenerateRandomMapProps,
  InstructionType,
  AnyInstruction,
  ProceduralScenario,
  TerrainType,
} from "@lob-sdk/types";
import { TerrainNoiseExecutor } from "./executors/terrain-noise";
import { HeightNoiseExecutor } from "./executors/height-noise";
import { TerrainCircleExecutor } from "./executors/terrain-circle";
import { TerrainRectangleExecutor } from "./executors/terrain-rectangle";
import { NaturalPathExecutor } from "./executors/natural-path";
import { ConnectClustersExecutor } from "./executors/connect-clusters";
import { ObjectiveExecutor } from "./executors/objective";
import { ObjectiveLayerExecutor } from "./executors/objective-layer";
import { LakeExecutor } from "./executors/lake";
import { generateRandomSeed } from "@lob-sdk/seed";
import { GameDataManager } from "@lob-sdk/game-data-manager";

export class RandomMapGenerator {
  generate({
    scenario,
    dynamicBattleType,
    maxPlayers,
    seed,
    tileSize,
    era,
    tilesX,
    tilesY,
  }: GenerateRandomMapProps): GenerateRandomMapResult {
    const gameDataManager = GameDataManager.get(era);
    const battleType = gameDataManager.getBattleType(dynamicBattleType);
    const mapSizeIndex = getMapSizeIndex(maxPlayers, battleType.mapSize.length);
    const battleSize = battleType.mapSize[mapSizeIndex] as Size;
    const mapSizes = gameDataManager.getMapSizes();
    const { map } = mapSizes[battleSize];

    if (!tilesX) {
      tilesX = map.tilesX;
    }
    if (!tilesY) {
      tilesY = map.tilesY;
    }

    const widthPx = tilesX * tileSize;
    const heightPx = tilesY * tileSize;

    const deploymentZones: [TeamDeploymentZone, TeamDeploymentZone] = [
      getDeploymentZoneBySize(battleSize, widthPx, heightPx, 1, era, tileSize),
      getDeploymentZoneBySize(battleSize, widthPx, heightPx, 2, era, tileSize),
    ];
    const objectives: ObjectiveDto<false>[] = [];

    const mapSeed = seed ?? generateRandomSeed();

    const terrains: TerrainType[][] = [];
    const heightMap: number[][] = [];

    // Initialize arrays
    for (let x = 0; x < tilesX; x++) {
      terrains[x] = [];
      heightMap[x] = [];
      for (let y = 0; y < tilesY; y++) {
        terrains[x][y] = TerrainType.Grass;
        heightMap[x][y] = 0;
      }
    }

    // Use baseTerrain from scenario if present, otherwise default to Grass
    const baseTerrain = scenario.baseTerrain ?? TerrainType.Grass;

    // Generate terrain and height
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        // Start with base terrain
        terrains[x][y] = baseTerrain;
      }
    }

    this.executeInstructions(
      scenario,
      mapSeed,
      terrains,
      heightMap,
      objectives,
      widthPx,
      heightPx,
      tilesX,
      tilesY,
      tileSize
    );

    return {
      map: {
        width: tilesX * tileSize,
        height: tilesY * tileSize,
        terrains,
        heightMap,
        deploymentZones,
        seed: mapSeed,
      },
      objectives,
    };
  }

  private executeInstructions(
    scenario: ProceduralScenario,
    seed: number,
    terrains: TerrainType[][],
    heightMap: number[][],
    objectives: ObjectiveDto<false>[],
    widthPx: number,
    heightPx: number,
    tilesX: number,
    tilesY: number,
    tileSize: number
  ) {
    scenario.instructions.forEach(
      (instruction: AnyInstruction, index: number) => {
        switch (instruction.type) {
          case InstructionType.HeightNoise: {
            new HeightNoiseExecutor(
              instruction,
              scenario,
              seed,
              index,
              terrains,
              heightMap
            ).execute();
            break;
          }
          case InstructionType.TerrainNoise: {
            new TerrainNoiseExecutor(
              instruction,
              scenario,
              seed,
              index,
              terrains,
              heightMap
            ).execute();
            break;
          }
          case InstructionType.TerrainCircle: {
            new TerrainCircleExecutor(
              instruction,
              scenario,
              seed,
              index,
              terrains,
              heightMap
            ).execute();
            break;
          }
          case InstructionType.TerrainRectangle: {
            new TerrainRectangleExecutor(
              instruction,
              scenario,
              seed,
              index,
              terrains,
              heightMap
            ).execute();
            break;
          }
          case InstructionType.NaturalPath: {
            new NaturalPathExecutor(
              instruction,
              scenario,
              seed,
              index,
              terrains,
              heightMap
            ).execute();
            break;
          }
          case InstructionType.ConnectClusters: {
            new ConnectClustersExecutor(
              instruction,
              scenario,
              seed,
              index,
              terrains,
              heightMap
            ).execute();
            break;
          }
          case InstructionType.Objective: {
            new ObjectiveExecutor(
              instruction,
              scenario,
              seed,
              index,
              widthPx,
              heightPx,
              objectives
            ).execute();
            break;
          }
          case InstructionType.Lake: {
            new LakeExecutor(
              instruction,
              scenario,
              seed,
              index,
              terrains,
              heightMap
            ).execute();
            break;
          }
          case InstructionType.ObjectiveLayer: {
            new ObjectiveLayerExecutor(
              instruction,
              tileSize,
              scenario,
              seed,
              index,
              terrains,
              heightMap,
              objectives,
              tilesX,
              tilesY
            ).execute();
            break;
          }

          default: {
            throw new Error(
              `Unknown instruction type: ${(instruction as any)?.type}`
            );
          }
        }
      }
    );
  }
}
