import { getMapSizeIndex } from "./map-size";
import { DeploymentZone, Size } from "@lob-sdk/types";
import {
  ObjectiveDto,
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
import { generateRandomSeed, randomSeeded, deriveSeed } from "@lob-sdk/seed";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import {
  addForwardDeploymentZones,
  calculateCircularPlayerDeploymentZone,
} from "./deployment";

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
    playerSetups,
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

    // Generate deployment zones per player if playerSetups is provided
    // Otherwise fall back to team-based zones for backward compatibility
    let deploymentZones: DeploymentZone[];

    // Get zone radius from map-sizes.json based on battle size
    const zoneSettings = mapSizes[battleSize].deployment;
    const zoneRadius = zoneSettings.radius * tileSize;

    // Calculate initial rotation for deployment zones based on seed
    // This rotates the entire circle of zones randomly
    const mapSeed = seed ?? generateRandomSeed();
    const deploymentRotationRandom = randomSeeded(deriveSeed(mapSeed, 123));
    const initialRotation = deploymentRotationRandom() * 2 * Math.PI; // Random rotation 0-2π

    if (playerSetups && playerSetups.length > 0) {
      // Use the radius from map-sizes.json for player-based zones
      const sortedPlayers = [...playerSetups].sort(
        (a, b) => a.player - b.player
      );
      const numPlayers = sortedPlayers.length;

      deploymentZones = sortedPlayers.map((playerSetup) => {
        const zone = calculateCircularPlayerDeploymentZone(
          playerSetup.player,
          numPlayers,
          widthPx,
          heightPx,
          zoneRadius,
          initialRotation
        );

        return {
          player: playerSetup.player,
          x: zone.x,
          y: zone.y,
          radius: zone.radius,
          ...(zone.rotation !== undefined && { rotation: zone.rotation }),
          capacity: zone.capacity ?? 0, // 0 = infinite capacity
        };
      });
    } else {
      throw new Error("Player setups are required");
    }

    // Add forward deployment zones for skirmishers if enabled in scenario
    if (
      scenario.forwardDeploymentZones &&
      playerSetups &&
      playerSetups.length > 0
    ) {
      deploymentZones = addForwardDeploymentZones(
        deploymentZones,
        playerSetups,
        widthPx,
        heightPx,
        scenario.forwardDeploymentZones
      );
    }

    const objectives: ObjectiveDto<false>[] = [];

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
