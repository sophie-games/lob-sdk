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
  Scenario,
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
    mapSize,
  }: GenerateRandomMapProps): GenerateRandomMapResult {
    const gameDataManager = GameDataManager.get(era);
    // Fixed-roster scenarios (tutorial, presets) pass `dynamicBattleType: null`.
    // Fall back to the era's DEFAULT_BATTLE_TYPE so downstream consumers
    // (NaturalPath amount scaling, scaledZones, procedural-zone defaults,
    // procedural-tile defaults) always have a battleSize to work with.
    const resolvedBattleType =
      dynamicBattleType ??
      gameDataManager.getGameConstants().DEFAULT_BATTLE_TYPE;
    const battleType = gameDataManager.getBattleType(resolvedBattleType);
    const mapSizeIndex = getMapSizeIndex(maxPlayers, battleType.mapSize.length);
    // Caller-supplied `mapSize` override wins; otherwise derive from the
    // player-count heuristic against `battleType.mapSize`.
    const battleSize = mapSize ?? battleType.mapSize[mapSizeIndex];
    const { map } = gameDataManager.getMapSizes()[battleSize];

    // Pre-placed objectives from the scenario seed the result; instruction
    // executors append on top. Callers should NOT merge `scenario.objectives`
    // again — the SDK owns the merge.
    const objectives: ObjectiveDto<false>[] = [
      ...(scenario.objectives ?? []),
    ];

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
      // Precedence: caller-supplied tilesX/tilesY (scenario editor) >
      // scenario.fixedSize (pinned dimensions) > battle-size defaults.
      if (!tilesX) {
        tilesX = scenario.fixedSize?.tilesX ?? map.tilesX;
      }
      if (!tilesY) {
        tilesY = scenario.fixedSize?.tilesY ?? map.tilesY;
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

  /** Reads pixel zones. */
  private _getPixelZones(
    scenario: Scenario,
  ): TeamDeploymentZones[] | undefined {
    return scenario.deploymentZones;
  }

  /** Reads percentage-based zones. */
  private _getRandomZones(
    scenario: Scenario,
  ): RandomTeamDeploymentZones | undefined {
    return scenario.randomDeploymentZones;
  }

  private _getScaledZones(
    scenario: Scenario,
  ): Record<Size, RandomTeamDeploymentZones> | undefined {
    return scenario.scaledDeploymentZones;
  }

  /**
   * Precedence: scenario.map.deploymentZones > scenario.deploymentZones >
   *             scenario.scaledDeploymentZones[battleSize] >
   *             scenario.randomDeploymentZones >
   *             battle-size defaults (procedural only).
   *
   * Returns `undefined` when the scenario ships a handcrafted `map` but
   * declares no zones anywhere. Battle-size defaults assume procedural
   * dimensions; for author-sized maps the consumer picks the right default
   * (era-wide constants centered on the fixed map).
   */
  private resolveDeploymentZones(
    scenario: Scenario,
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
    const tilesX = terrains.length;
    const tilesY = terrains[0].length;

    const build = (
      team: number,
      type: "main" | "forward",
      zone: RandomTeamDeploymentZones[keyof RandomTeamDeploymentZones],
    ): TeamDeploymentZone => ({
      team,
      type,
      x:
        getRandomInt(
          this.percentToTiles(zone.minX, tilesX),
          this.percentToTiles(zone.maxX, tilesX),
          random,
        ) * tileSize,
      y:
        getRandomInt(
          this.percentToTiles(zone.minY, tilesY),
          this.percentToTiles(zone.maxY, tilesY),
          random,
        ) * tileSize,
      width: this.percentToTiles(zone.width, tilesX) * tileSize,
      height: this.percentToTiles(zone.height, tilesY) * tileSize,
    });

    return [
      {
        team: 1,
        zones: [
          build(1, "main", deploymentZones.bottomMainDeploymentZone),
          build(1, "forward", deploymentZones.bottomForwardDeploymentZone),
        ],
      },
      {
        team: 2,
        zones: [
          build(2, "main", deploymentZones.topMainDeploymentZone),
          build(2, "forward", deploymentZones.topForwardDeploymentZone),
        ],
      },
    ];
  }

  private percentToTiles(percent: number, tileLength: number) {
    return Math.floor((percent / 100) * (tileLength - 1));
  }

  private executeInstructions(
    scenario: Scenario,
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
