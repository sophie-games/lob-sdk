import {
  AnyOrder,
  IServerGame,
  OrderPathPoint,
  OrderType,
  UnitCategoryId,
} from "@lob-sdk/types";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { Point2, Vector2 } from "@lob-sdk/vector";
import { UnitGroup } from "./unit-group";
import { TurnSubmission } from "@lob-sdk/types";
import { IBot, OnBotPlayScript } from "../types";
import { AStar } from "@lob-sdk/a-star";
import { getSquaredDistance } from "@lob-sdk/utils";
import { douglasPeucker } from "@lob-sdk/douglas-peucker";
import { BaseUnit } from "@lob-sdk/unit";

/**
 * A string identifier for bot unit categories (e.g., "Infantry", "Cavalry", "Artillery").
 */
export type BotUnitCategory = string;

/**
 * Strategy configuration for a unit category.
 */
export interface UnitStrategy {
  /** The behavior type (e.g., "balanced", "flanking", "support"). */
  behavior: string;
  /** Whether to prefer fire and advance orders. */
  preferFireAndAdvance?: boolean;
  /** Organization threshold for charging. */
  chargeThreshold?: number;
  /** Group cohesion distance multiplier. */
  groupCohesion: number;
  /** Whether to prefer running over walking. */
  preferRun?: boolean;
  /** Whether to avoid artillery units. */
  avoidArtillery?: boolean;
  /** Whether to maintain distance from enemies. */
  maintainDistance?: boolean;
  /** Minimum distance to maintain from enemies (in tiles). */
  minDistanceFromEnemies?: number;
}

/**
 * Configuration for bot behavior, including category groupings, group sizes, and strategies.
 */
export interface BotConfig {
  /** Maps unit category IDs to bot unit categories. */
  categoryGroups: Record<UnitCategoryId, BotUnitCategory>;
  /** Maximum number of units per group for each bot category. */
  maxGroupSize: Record<BotUnitCategory, number>;
  /** Strategy configuration for each bot category. */
  strategies: Record<BotUnitCategory, UnitStrategy>;
  /** Threshold values for bot decision-making. */
  thresholds: {
    /** Organization threshold for charging. */
    orgChargeThreshold: number;
  };
}

/**
 * A bot implementation for WW2 era gameplay.
 * Uses unit grouping and strategic decision-making to control units.
 */
export class Ww2Bot implements IBot {
  /** The team number this bot belongs to. */
  private _team: number;
  private _allyGroups: UnitGroup[] = [];
  private _enemyGroups: UnitGroup[] = [];
  private _onBotPlayScript: OnBotPlayScript | null = null;
  private _scriptName: string | null = null;

  private static _config: BotConfig = {
    categoryGroups: {
      infantry: "Infantry",
      motorized: "Infantry",
      armored: "Infantry",
    },
    maxGroupSize: {
      Infantry: 4,
      Cavalry: 3,
    },
    strategies: {
      Infantry: {
        behavior: "defensive",
        preferFireAndAdvance: true,
        chargeThreshold: 200,
        groupCohesion: 3,
      },
    },
    thresholds: {
      orgChargeThreshold: 200,
    },
  };

  private get _botConfig(): BotConfig {
    return Ww2Bot._config;
  }

  private _getBotUnitCategory(categoryId: UnitCategoryId): BotUnitCategory {
    return this._botConfig.categoryGroups[categoryId];
  }

  private _getMaxGroupSize(botCategory: BotUnitCategory): number {
    return this._botConfig.maxGroupSize[botCategory];
  }

  private _getGroupCohesion(botCategory: BotUnitCategory): number {
    // Get the strategy for this category dynamically
    const strategy = this._getStrategyForType(botCategory);
    return strategy.groupCohesion;
  }

  /**
   * Creates a new BotWW2 instance.
   * @param gameDataManager - The game data manager instance.
   * @param game - The server game instance.
   * @param playerNumber - The player number this bot controls.
   */
  constructor(
    private _gameDataManager: GameDataManager,
    private _game: IServerGame,
    private _playerNumber: number,
  ) {
    this._team = this._game.getPlayerTeam(this._playerNumber);
  }

  /**
   * Sets a custom bot play script that overrides the default bot behavior.
   * @param onBotPlayScript - The custom script function.
   * @param scriptName - Optional name for the script.
   */
  setOnBotPlayScript(onBotPlayScript: OnBotPlayScript, scriptName?: string) {
    this._onBotPlayScript = onBotPlayScript;
    this._scriptName = scriptName || null;
  }

  /**
   * Gets the name of the currently set bot script, if any.
   * @returns The script name, or null if no custom script is set.
   */
  getScriptName(): string | null {
    return this._scriptName;
  }

  /**
   * Executes the bot's turn, generating orders for all controlled units.
   * @returns A promise that resolves to the turn submission with orders.
   */
  async play(): Promise<TurnSubmission> {
    if (this._onBotPlayScript) {
      try {
        const result = await this._onBotPlayScript(this._game, this._playerNumber);

        if (result) {
          /**
           * If the custom bot script returns a turn submission,
           * use it instead of the default bot behavior.
           */
          return result;
        }
      } catch (error) {
        console.error("Error executing custom bot script:", error);
        // Fall back to default bot behavior on error
      }
    }

    const myUnits = this._getMyUnits();
    const enemies = this._getEnemyUnits();

    const turnSubmission: TurnSubmission = {
      turn: this._game.turnNumber,
      orders: [],
      autofireConfigChanges: [],
    };

    const orders = turnSubmission.orders;

    // Reset groups
    this._allyGroups = this._formGroups(myUnits);
    this._enemyGroups = this._formGroups(enemies);

    for (const group of this._allyGroups) {
      const groupType = this._getBotUnitCategory(group.category);
      this._processUnitGroup(group, groupType, orders);
    }

    return turnSubmission;
  }

  private _getMyUnits() {
    return this._game
      .getUnits()
      .filter((unit) => unit.player === this._playerNumber);
  }

  private _getEnemyUnits() {
    // Use fog of war filtered method to only see visible enemy units
    return this._game.getVisibleEnemyUnits(this._playerNumber);
  }

  private _processUnitGroup(
    group: UnitGroup,
    groupType: BotUnitCategory,
    orders: AnyOrder[],
  ) {
    if (group.size === 0) return;

    const groupCenter = group.getCenter();
    const strategy = this._getStrategyForType(groupType);

    const closestEnemyGroup = this._getClosestGroup(
      groupCenter,
      this._enemyGroups,
    );
    const closestEnemyObjective = this._game.getClosestEnemyObjective(
      groupCenter,
      this._team,
    );

    const targetPositions: Vector2[] = [];

    if (closestEnemyGroup) {
      targetPositions.push(closestEnemyGroup.getCenter());
    }

    if (closestEnemyObjective) {
      targetPositions.push(closestEnemyObjective.position);
    }

    if (targetPositions.length === 0) {
      return;
    }

    const targetPosition = groupCenter.getClosestVector(targetPositions);
    if (targetPosition === null) {
      return;
    }

    group.units.forEach((unit) => {
      this._processUnit(unit, groupType, strategy, targetPosition, orders);
    });
  }

  private _processUnit(
    unit: BaseUnit,
    groupType: BotUnitCategory,
    strategy: any,
    targetPosition: Vector2,
    orders: AnyOrder[],
  ) {
    // Use fog of war filtered method to only see visible nearby enemies
    const nearbyEnemies = this._game
      .getVisibleNearbyUnits(
        this._playerNumber,
        unit.position,
        unit.getMaxRange() * 2,
      )
      .filter((enemy) => enemy.team !== unit.team && !enemy.isRouting());

    const closestEnemy = this._game.getVisibleClosestUnitOf(
      this._playerNumber,
      unit.position,
      nearbyEnemies,
    );

    // Process unit based on strategy properties dynamically
    this._processUnitByStrategy(
      unit,
      closestEnemy,
      strategy,
      targetPosition,
      orders,
    );
  }

  private _processUnitByStrategy(
    unit: BaseUnit,
    closestEnemy: BaseUnit | null,
    strategy: any,
    targetPosition: Vector2,
    orders: AnyOrder[],
  ) {
    // Handle charging logic if strategy has chargeThreshold
    if (closestEnemy && strategy.chargeThreshold !== undefined) {
      const shouldCharge =
        closestEnemy.org < unit.org &&
        Math.abs(unit.org - closestEnemy.org) >= strategy.chargeThreshold;

        if (shouldCharge) {
        orders.push({
          type: OrderType.Run,
          id: unit.id,
          targetId: closestEnemy.id,
        });
        return;
      }
    }

    // Handle Fire & Advance vs Walk preference
    if (closestEnemy && strategy.preferFireAndAdvance !== undefined) {
      if (strategy.preferFireAndAdvance) {
        const path = this._getMovementPath(unit, closestEnemy.position);
        orders.push({
          type: OrderType.FireAndAdvance,
          id: unit.id,
          path: path,
        });
      } else {
        orders.push({
          type: OrderType.Walk,
          id: unit.id,
          targetId: closestEnemy.id,
        });
      }
      return;
    }

    // Handle artillery avoidance for cavalry
    if (strategy.avoidArtillery && closestEnemy) {
      const enemyGroupType = this._getBotUnitCategory(closestEnemy.category);
      // Find groups that are NOT of the same type as the enemy
      const alternativeGroups = this._enemyGroups.filter(
        (group) => this._getBotUnitCategory(group.category) !== enemyGroupType,
      );
      if (alternativeGroups.length > 0) {
        const alternativeTarget = this._getClosestGroup(
          unit.position,
          alternativeGroups,
        );
        if (alternativeTarget) {
          targetPosition = alternativeTarget.getCenter();
        }
      }
    }

    // Handle artillery distance maintenance
    if (
      strategy.maintainDistance &&
      strategy.minDistanceFromEnemies !== undefined
    ) {
      // Use fog of war filtered method to only see visible nearby enemies
      const nearbyEnemies = this._game
        .getVisibleNearbyUnits(
          this._playerNumber,
          unit.position,
          strategy.minDistanceFromEnemies *
            this._gameDataManager.getGameConstants().TILE_SIZE,
        )
        .filter((enemy) => enemy.team !== unit.team && !enemy.isRouting());

      if (nearbyEnemies.length > 0) {
        const enemyCenter = this._getClosestGroup(
          unit.position,
          this._enemyGroups,
        )?.getCenter();
        if (enemyCenter) {
          const direction = unit.position.subtract(enemyCenter).normalize();
          const retreatPosition = unit.position.add(
            direction.scale(
              strategy.minDistanceFromEnemies *
                this._gameDataManager.getGameConstants().TILE_SIZE,
            ),
          );
          const path = this._getMovementPath(unit, retreatPosition);
          orders.push({
            type: OrderType.Walk,
            id: unit.id,
            path,
          });
        }
        return;
      }
    }

    // Check if unit is already in range (for artillery)
    // Use fog of war filtered method to only see visible nearby enemies
    const nearbyEnemies = this._game
      .getVisibleNearbyUnits(
        this._playerNumber,
        unit.position,
        unit.getMaxRange(),
      )
      .filter((enemy) => enemy.team !== unit.team && !enemy.isRouting());

    if (nearbyEnemies.length > 0) {
      return; // Stay in position if already in range
    }

    // Default movement towards target
    const path = this._getMovementPath(unit, targetPosition);

    if (strategy.preferRun) {
      orders.push({
        type: OrderType.Run,
        id: unit.id,
        path,
      });
    } else {
      orders.push({
        type: OrderType.Walk,
        id: unit.id,
        path,
      });
    }
  }

  private _getStrategyForType(groupType: BotUnitCategory) {
    return this._botConfig.strategies[groupType];
  }

  private _formGroups(units: BaseUnit[]) {
    const { TILE_SIZE } = this._gameDataManager.getGameConstants();

    const groups: UnitGroup[] = [];

    for (const unit of units) {
      if (unit.isRoutingOrRecovering()) {
        continue;
      }

      let addedToGroup = false;
      const unitGroupType = this._getBotUnitCategory(unit.category);

      for (const group of groups) {
        const groupType = this._getBotUnitCategory(group.category);
        const maxSize = this._getMaxGroupSize(groupType);

        if (
          group.size < maxSize &&
          groupType === unitGroupType &&
          unit.position.distanceTo(group.getCenter()) <=
            TILE_SIZE * this._getGroupCohesion(groupType)
        ) {
          addedToGroup = true;
          group.addUnit(unit);
          break;
        }
      }

      if (!addedToGroup) {
        const newGroup = new UnitGroup([unit], unit.category);
        groups.push(newGroup);
      }
    }

    return groups;
  }

  private _getClosestGroup(position: Point2, groups: UnitGroup[]) {
    let closestGroup: UnitGroup | null = null;
    let closestDistance = Infinity;

    for (const group of groups) {
      const squaredDistance = getSquaredDistance(position, group.getCenter());

      if (squaredDistance < closestDistance) {
        closestDistance = squaredDistance;
        closestGroup = group;
      }
    }

    return closestGroup;
  }

  private _getMovementPath(
    unit: BaseUnit,
    { x: endX, y: endY }: Point2,
  ): OrderPathPoint[] {
    const { TILE_SIZE } = this._gameDataManager.getGameConstants();

    const formationDimensions = this._gameDataManager.getUnitDimensions(
      unit.type,
      unit.currentFormation,
    );

    const getStepCost = (from: Point2, to: Point2) => {
      const terrain = this._game.map.terrains[to.x][to.y];
      const modifier = this._gameDataManager.getMovementModifier(
        terrain,
        unit.category,
      );

      const isPassable = this._gameDataManager.isPassable(terrain, unit.category);

      if (!isPassable) {
        return Infinity;
      }

      const terrainCost = this._getTerrainCost(modifier);

      // Check for allied units at the target position
      const positionToCheck = {
        x: to.x * TILE_SIZE + TILE_SIZE / 2,
        y: to.y * TILE_SIZE + TILE_SIZE / 2,
      };

      // Use unit's actual height for nearby units search
      const unitHeight = formationDimensions.height;
      const alliedUnits = this._game
        .getNearbyUnits<BaseUnit>(positionToCheck, unitHeight)
        .filter(
          (u) =>
            u.team === unit.team &&
            u.id !== unit.id && // Don't count the unit itself
            !u.isRoutingOrRecovering(),
        );

      // Multiply cost if allied unit is present (e.g., multiply by 5)
      const allyCostMultiplier = alliedUnits.length > 0 ? 5 : 1;

      return terrainCost * allyCostMultiplier;
    };

    const tileWidth = this._game.map.terrains.length;
    const tileHeight = this._game.map.terrains[0]?.length ?? 0;
    const aStar = new AStar(tileWidth, tileHeight, getStepCost);

    const startTile = {
      x: Math.floor(unit.position.x / TILE_SIZE),
      y: Math.floor(unit.position.y / TILE_SIZE),
    };

    const endTile = {
      x: Math.floor(endX / TILE_SIZE),
      y: Math.floor(endY / TILE_SIZE),
    };

    let path = aStar.findPath(startTile, endTile);

    if (path === null) {
      return []; // Don't move if no valid path exists
    }

    path = douglasPeucker(path);

    const halfTileSize = TILE_SIZE / 2;

    return path.reduce((acc: OrderPathPoint[], curr, i) => {
      if (i === 0) {
        return acc;
      }

      acc.push([
        curr.x * TILE_SIZE + halfTileSize,
        curr.y * TILE_SIZE + halfTileSize,
      ]);

      return acc;
    }, []);
  }

  private _getTerrainCost(movementModifier: number) {
    // Calculate speed factor: 1 is base speed, +modifier increases it, -modifier decreases it
    const speedFactor = 1 + movementModifier; // e.g., +0.5 -> 1.5, -0.5 -> 0.5

    // Cost is inverse of speed: faster = lower cost, slower = higher cost
    const cost = 1 / speedFactor;

    // Round to nearest integer, but allow fractional costs for positive modifiers
    return cost;
  }

  /**
   * Gets the player number this bot controls.
   * @returns The player number.
   */
  getPlayerNumber(): number {
    return this._playerNumber;
  }

  /**
   * Gets the team number this bot belongs to.
   * @returns The team number.
   */
  getTeam(): number {
    return this._team;
  }
}
