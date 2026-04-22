import { getDeploymentZonesByMapSize, getMapSizeIndex } from "./map-size";
import {
  GameMap,
  RandomTeamDeploymentZones,
  Size,
  TeamDeploymentZones,
} from "@lob-sdk/types";
import {
  ObjectiveDto,
  TeamDeploymentZone,
  GenerateRandomMapResult,
  GenerateRandomMapProps,
  InstructionType,
  AnyInstruction,
  ProceduralScenario,
  TerrainType,
  Range,
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
import { deriveSeed, generateRandomSeed, randomSeeded } from "@lob-sdk/seed";
import { GameDataManager, GameEra } from "@lob-sdk/game-data-manager";
import { getRandomInt } from "@lob-sdk/utils";

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

    const objectives: ObjectiveDto<false>[] = [];

    // Caller-supplied seed wins; otherwise prefer the baked map's seed; else random.
    const fixedMap: GameMap | undefined = scenario.map;
    const mapSeed = seed ?? fixedMap?.seed ?? generateRandomSeed();

    let terrains: TerrainType[][];
    let heightMap: number[][];
    let widthPx: number;
    let heightPx: number;

    if (fixedMap) {
      // Deep-copy to avoid mutating frozen JSON imports when overlays run.
      terrains = fixedMap.terrains.map((row) => [...row]);
      heightMap = fixedMap.heightMap.map((row) => [...row]);
      widthPx = fixedMap.width;
      heightPx = fixedMap.height;
    } else {
      if (!tilesX) {
        tilesX = map.tilesX;
      }
      if (!tilesY) {
        tilesY = map.tilesY;
      }

      widthPx = tilesX * tileSize;
      heightPx = tilesY * tileSize;

      terrains = [];
      heightMap = [];
      for (let x = 0; x < tilesX; x++) {
        terrains[x] = [];
        heightMap[x] = [];
        for (let y = 0; y < tilesY; y++) {
          terrains[x][y] = scenario.baseTerrain ?? TerrainType.Grass;
          heightMap[x][y] = 0;
        }
      }
    }

    const instructionsToRun: AnyInstruction[] = scenario.instructions ?? [];

    this.executeInstructions(
      scenario,
      mapSeed,
      terrains,
      heightMap,
      objectives,
      widthPx,
      heightPx,
      tileSize,
      battleSize,
      instructionsToRun,
    );

    const deploymentZones = this.resolveDeploymentZones(
      scenario,
      fixedMap,
      battleSize,
      widthPx,
      heightPx,
      era,
      tileSize,
      terrains,
      mapSeed,
    );

    return {
      map: {
        width: widthPx,
        height: heightPx,
        terrains,
        heightMap,
        ...(deploymentZones ? { deploymentZones } : {}),
        seed: mapSeed,
      },
      objectives,
    };
  }

  /** Reads pixel zones (Scenario only — LegacyRandomScenario declares this as `never`). */
  private _getPixelZones(
    scenario: ProceduralScenario,
  ): TeamDeploymentZones[] | undefined {
    return scenario.deploymentZones;
  }

  /** Reads percentage-based zones from either Scenario or LegacyRandomScenario. */
  private _getRandomZones(
    scenario: ProceduralScenario,
  ): RandomTeamDeploymentZones | undefined {
    return scenario.randomDeploymentZones ?? scenario.defaultDeploymentZones;
  }

  private _getScaledZones(
    scenario: ProceduralScenario,
  ): Record<Size, RandomTeamDeploymentZones> | undefined {
    return scenario.scaledDeploymentZones;
  }

  /**
   * Precedence: scenario.map.deploymentZones > scenario.deploymentZones >
   *             scenario.scaledDeploymentZones[battleSize] >
   *             scenario.randomDeploymentZones / defaultDeploymentZones >
   *             battle-size defaults (procedural only).
   *
   * Returns `undefined` when the scenario ships a handcrafted `map` but
   * declares no zones anywhere. Battle-size defaults assume procedural
   * dimensions; for author-sized maps the consumer picks the right default
   * (era-wide constants centered on the fixed map).
   */
  private resolveDeploymentZones(
    scenario: ProceduralScenario,
    fixedMap: GameMap | undefined,
    battleSize: Size,
    widthPx: number,
    heightPx: number,
    era: GameEra,
    tileSize: number,
    terrains: TerrainType[][],
    mapSeed: number,
  ): [TeamDeploymentZones, TeamDeploymentZones] | undefined {
    const bakedZones = fixedMap?.deploymentZones;
    if (bakedZones && bakedZones.length >= 2) {
      return [bakedZones[0], bakedZones[1]];
    }

    const pixelZones = this._getPixelZones(scenario);
    if (pixelZones && pixelZones.length >= 2) {
      return [pixelZones[0], pixelZones[1]];
    }

    const randomZones =
      this._getScaledZones(scenario)?.[battleSize] ??
      this._getRandomZones(scenario);

    if (randomZones) {
      return this._computePercentZones(
        randomZones,
        terrains,
        tileSize,
        mapSeed,
      );
    }

    // Handcrafted map with no declarations: let the consumer decide.
    if (fixedMap) {
      return undefined;
    }

    return [
      getDeploymentZonesByMapSize(
        battleSize,
        widthPx,
        heightPx,
        1,
        era,
        tileSize,
      ),
      getDeploymentZonesByMapSize(
        battleSize,
        widthPx,
        heightPx,
        2,
        era,
        tileSize,
      ),
    ];
  }

  private _computePercentZones(
    deploymentZones: RandomTeamDeploymentZones,
    terrains: TerrainType[][],
    tileSize: number,
    seed: number,
  ): [TeamDeploymentZones, TeamDeploymentZones] {
    const random = randomSeeded(deriveSeed(seed, 0));
    return [
      {
        team: 1,
        mainZone: {
          team: 1,
          x:
            getRandomInt(
              this.percentToTiles(
                deploymentZones.bottomMainDeploymentZone.minX,
                terrains.length,
              ),
              this.percentToTiles(
                deploymentZones.bottomMainDeploymentZone.maxX,
                terrains.length,
              ),
              random,
            ) * tileSize,
          y:
            getRandomInt(
              this.percentToTiles(
                deploymentZones.bottomMainDeploymentZone.minY,
                terrains[0].length,
              ),
              this.percentToTiles(
                deploymentZones.bottomMainDeploymentZone.maxY,
                terrains[0].length,
              ),
              random,
            ) * tileSize,
          width:
            this.percentToTiles(
              deploymentZones.bottomMainDeploymentZone.width,
              terrains.length,
            ) * tileSize,
          height:
            this.percentToTiles(
              deploymentZones.bottomMainDeploymentZone.height,
              terrains[0].length,
            ) * tileSize,
        },
        forwardZone: {
          team: 1,
          x:
            getRandomInt(
              this.percentToTiles(
                deploymentZones.bottomForwardDeploymentZone.minX,
                terrains.length,
              ),
              this.percentToTiles(
                deploymentZones.bottomForwardDeploymentZone.maxX,
                terrains.length,
              ),
              random,
            ) * tileSize,
          y:
            getRandomInt(
              this.percentToTiles(
                deploymentZones.bottomForwardDeploymentZone.minY,
                terrains[0].length,
              ),
              this.percentToTiles(
                deploymentZones.bottomForwardDeploymentZone.maxY,
                terrains[0].length,
              ),
              random,
            ) * tileSize,
          width:
            this.percentToTiles(
              deploymentZones.bottomForwardDeploymentZone.width,
              terrains.length,
            ) * tileSize,
          height:
            this.percentToTiles(
              deploymentZones.bottomForwardDeploymentZone.height,
              terrains[0].length,
            ) * tileSize,
        },
      },
      {
        team: 2,
        mainZone: {
          team: 2,
          x:
            getRandomInt(
              this.percentToTiles(
                deploymentZones.topMainDeploymentZone.minX,
                terrains.length,
              ),
              this.percentToTiles(
                deploymentZones.topMainDeploymentZone.maxX,
                terrains.length,
              ),
              random,
            ) * tileSize,
          y:
            getRandomInt(
              this.percentToTiles(
                deploymentZones.topMainDeploymentZone.minY,
                terrains[0].length,
              ),
              this.percentToTiles(
                deploymentZones.topMainDeploymentZone.maxY,
                terrains[0].length,
              ),
              random,
            ) * tileSize,
          width:
            this.percentToTiles(
              deploymentZones.topMainDeploymentZone.width,
              terrains.length,
            ) * tileSize,
          height:
            this.percentToTiles(
              deploymentZones.topMainDeploymentZone.height,
              terrains[0].length,
            ) * tileSize,
        },
        forwardZone: {
          team: 2,
          x:
            getRandomInt(
              this.percentToTiles(
                deploymentZones.topForwardDeploymentZone.minX,
                terrains.length,
              ),
              this.percentToTiles(
                deploymentZones.topForwardDeploymentZone.maxX,
                terrains.length,
              ),
              random,
            ) * tileSize,
          y:
            getRandomInt(
              this.percentToTiles(
                deploymentZones.topForwardDeploymentZone.minY,
                terrains[0].length,
              ),
              this.percentToTiles(
                deploymentZones.topForwardDeploymentZone.maxY,
                terrains[0].length,
              ),
              random,
            ) * tileSize,
          width:
            this.percentToTiles(
              deploymentZones.topForwardDeploymentZone.width,
              terrains.length,
            ) * tileSize,
          height:
            this.percentToTiles(
              deploymentZones.topForwardDeploymentZone.height,
              terrains[0].length,
            ) * tileSize,
        },
      },
    ];
  }

  private percentToTiles(percent: number, tileLength: number) {
    return Math.floor((percent / 100) * (tileLength - 1));
  }

  private executeInstructions(
    scenario: ProceduralScenario,
    seed: number,
    terrains: TerrainType[][],
    heightMap: number[][],
    objectives: ObjectiveDto<false>[],
    widthPx: number,
    heightPx: number,
    tileSize: number,
    battleSize: Size,
    instructions: AnyInstruction[],
  ) {
    instructions.forEach(
      (instruction: AnyInstruction, index: number) => {
        let boundedTerrains = terrains;
        let boundedHeightMap = heightMap;
        if (instruction.xBounds && instruction.yBounds) {
          boundedTerrains = this.create2DSliceProxy(
            terrains,
            instruction.xBounds,
            instruction.yBounds,
          );
          boundedHeightMap = this.create2DSliceProxy(
            heightMap,
            instruction.xBounds,
            instruction.yBounds,
          );
        }
        switch (instruction.type) {
          case InstructionType.HeightNoise: {
            new HeightNoiseExecutor(
              instruction,
              scenario,
              seed,
              index,
              boundedTerrains,
              boundedHeightMap,
            ).execute();
            break;
          }
          case InstructionType.TerrainNoise: {
            new TerrainNoiseExecutor(
              instruction,
              scenario,
              seed,
              index,
              boundedTerrains,
              boundedHeightMap,
            ).execute();
            break;
          }
          case InstructionType.TerrainCircle: {
            new TerrainCircleExecutor(
              instruction,
              scenario,
              seed,
              index,
              boundedTerrains,
              boundedHeightMap,
            ).execute();
            break;
          }
          case InstructionType.TerrainRectangle: {
            new TerrainRectangleExecutor(
              instruction,
              scenario,
              seed,
              index,
              boundedTerrains,
              boundedHeightMap,
            ).execute();
            break;
          }
          case InstructionType.NaturalPath: {
            new NaturalPathExecutor(
              instruction,
              scenario,
              seed,
              index,
              boundedTerrains,
              boundedHeightMap,
              battleSize,
            ).execute();
            break;
          }
          case InstructionType.ConnectClusters: {
            new ConnectClustersExecutor(
              instruction,
              scenario,
              seed,
              index,
              boundedTerrains,
              boundedHeightMap,
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
              objectives,
            ).execute();
            break;
          }
          case InstructionType.Lake: {
            new LakeExecutor(
              instruction,
              scenario,
              seed,
              index,
              boundedTerrains,
              boundedHeightMap,
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
              boundedTerrains,
              boundedHeightMap,
              objectives,
              Math.floor(
                ((instruction.xBounds?.min ?? 0) / 100) * terrains.length,
              ),
              Math.floor(
                ((instruction.yBounds?.min ?? 0) / 100) * terrains[0].length,
              ),
            ).execute();
            break;
          }
          default: {
            const _exhaustive: never = instruction;
            throw new Error(
              `Unknown instruction type: ${JSON.stringify(_exhaustive)}`,
            );
          }
        }
      },
    );
  }

  // Creates a proxy for a slice of a 2D array. So we can pass bounded areas without having to reprogram all executors
  private create2DSliceProxy<T>(
    array: T[][],
    xRange: Range,
    yRange: Range,
  ): T[][] {
    // Slice the 2D array according to specified rows and columns
    const xStart = Math.floor((xRange.min / 100) * array.length);
    const xEnd = Math.floor((xRange.max / 100) * array.length);
    const yStart = Math.floor((yRange.min / 100) * array[0].length);
    const yEnd = Math.floor((yRange.max / 100) * array[0].length);

    // Create proxied rows
    const proxiedRows: T[][] = [];
    for (let i = xStart; i < xEnd; i++) {
      const originalRow = array[i];
      const rowSlice = originalRow.slice(yStart, yEnd);

      // Wrap the row slice in a proxy
      const rowProxy = new Proxy(rowSlice, {
        set(target, colKey, value) {
          const colIndex = Number(colKey);
          if (!isNaN(colIndex) && colIndex < rowSlice.length) {
            // Update original array
            array[i][yStart + colIndex] = value;
            // Update proxy
            target[colIndex] = value;
            return true;
          }
          return false;
        },
      });

      proxiedRows.push(rowProxy);
    }
    return proxiedRows;
  }
}
