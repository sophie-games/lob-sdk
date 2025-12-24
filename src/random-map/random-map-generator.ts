import {
  getBattleSizeByMode,
  getDeploymentZoneBySize,
  getMapSize,
} from "./map-size";
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
import { LakeExecutor } from "./executors/lake";
import { generateRandomSeed } from "@lob-sdk/seed";

export class RandomMapGenerator {
  generate({
    scenario,
    dynamicBattleType,
    maxPlayers,
    seed,
    size,
    tileSize,
  }: GenerateRandomMapProps): GenerateRandomMapResult {
    const battleSize = getBattleSizeByMode(dynamicBattleType, maxPlayers);
    const { width, height } = size ?? getMapSize(battleSize);
    const deploymentZones: [TeamDeploymentZone, TeamDeploymentZone] = [
      getDeploymentZoneBySize(battleSize, width, height, 1),
      getDeploymentZoneBySize(battleSize, width, height, 2),
    ];
    const objectives: ObjectiveDto<false>[] = [];

    const mapSeed = seed ?? generateRandomSeed();

    // Ensure dimensions are positive integers
    const tilesX = Math.max(1, Math.floor(width / tileSize));
    const tilesY = Math.max(1, Math.floor(height / tileSize));

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
      width,
      height
    );

    // smoothenTerrains(terrains, tilesX, tilesY, scenario.terrains, baseTerrain);

    // Generate borders for terrain types that have border configuration
    // generateTerrainBorders(
    //   terrains,
    //   heightMap,
    //   scenario.terrains,
    //   tilesX,
    //   tilesY
    // );

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
    width: number,
    height: number
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
              width,
              height,
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
