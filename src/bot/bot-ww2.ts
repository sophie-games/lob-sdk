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
import { BotConfig, BotUnitCategory, IBot, OnBotPlayScript } from "./types";
import { AStar } from "@lob-sdk/a-star";
import { getSquaredDistance } from "@lob-sdk/utils";
import { douglasPeucker } from "@lob-sdk/douglas-peucker";
import { BaseUnit } from "@lob-sdk/unit";

/**
 * A bot implementation for WW2 era gameplay.
 * Uses unit grouping and strategic decision-making to control units.
 */
export class BotWW2 implements IBot {
  /** The team number this bot belongs to. */
  private team: number;
  private allyGroups: UnitGroup[] = [];
  private enemyGroups: UnitGroup[] = [];
  private onBotPlayScript: OnBotPlayScript | null = null;
  private scriptName: string | null = null;

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
    return BotWW2._config;
  }

  private getBotUnitCategory(categoryId: UnitCategoryId): BotUnitCategory {
    return this._botConfig.categoryGroups[categoryId];
  }

  private getMaxGroupSize(botCategory: BotUnitCategory): number {
    return this._botConfig.maxGroupSize[botCategory];
  }

  private getGroupCohesion(botCategory: BotUnitCategory): number {
    // Get the strategy for this category dynamically
    const strategy = this.getStrategyForType(botCategory);
    return strategy.groupCohesion;
  }

  /**
   * Creates a new BotWW2 instance.
   * @param gameDataManager - The game data manager instance.
   * @param game - The server game instance.
   * @param playerNumber - The player number this bot controls.
   */
  constructor(
    private gameDataManager: GameDataManager,
    private game: IServerGame,
    private playerNumber: number
  ) {
    this.team = this.game.getPlayerTeam(this.playerNumber);
  }

  /**
   * Sets a custom bot play script that overrides the default bot behavior.
   * @param onBotPlayScript - The custom script function.
   * @param scriptName - Optional name for the script.
   */
  setOnBotPlayScript(onBotPlayScript: OnBotPlayScript, scriptName?: string) {
    this.onBotPlayScript = onBotPlayScript;
    this.scriptName = scriptName || null;
  }

  /**
   * Gets the name of the currently set bot script, if any.
   * @returns The script name, or null if no custom script is set.
   */
  getScriptName(): string | null {
    return this.scriptName;
  }

  /**
   * Executes the bot's turn, generating orders for all controlled units.
   * @returns A promise that resolves to the turn submission with orders.
   */
  async play(): Promise<TurnSubmission> {
    if (this.onBotPlayScript) {
      try {
        const result = await this.onBotPlayScript(this.game, this.playerNumber);

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

    const myUnits = this.getMyUnits();
    const enemies = this.getEnemyUnits();

    const turnSubmission: TurnSubmission = {
      turn: this.game.turnNumber,
      orders: [],
      autofireConfigChanges: [],
    };

    const orders = turnSubmission.orders;

    // Reset groups
    this.allyGroups = this.formGroups(myUnits);
    this.enemyGroups = this.formGroups(enemies);

    for (const group of this.allyGroups) {
      const groupType = this.getBotUnitCategory(group.category);
      this.processUnitGroup(group, groupType, orders);
    }

    return turnSubmission;
  }

  private getMyUnits() {
    return this.game
      .getUnits()
      .filter((unit) => unit.player === this.playerNumber);
  }

  private getEnemyUnits() {
    // Use fog of war filtered method to only see visible enemy units
    return this.game.getVisibleEnemyUnits(this.playerNumber);
  }

  private processUnitGroup(
    group: UnitGroup,
    groupType: BotUnitCategory,
    orders: AnyOrder[]
  ) {
    if (group.size === 0) return;

    const groupCenter = group.getCenter();
    const strategy = this.getStrategyForType(groupType);

    const closestEnemyGroup = this.getClosestGroup(
      groupCenter,
      this.enemyGroups
    );
    const closestEnemyObjective = this.game.getClosestEnemyObjective(
      groupCenter,
      this.team
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
      this.processUnit(unit, groupType, strategy, targetPosition, orders);
    });
  }

  private processUnit(
    unit: BaseUnit,
    groupType: BotUnitCategory,
    strategy: any,
    targetPosition: Vector2,
    orders: AnyOrder[]
  ) {
    // Use fog of war filtered method to only see visible nearby enemies
    const nearbyEnemies = this.game
      .getVisibleNearbyUnits(
        this.playerNumber,
        unit.position,
        unit.getMaxRange() * 2
      )
      .filter((enemy) => enemy.team !== unit.team && !enemy.isRouting());

    const closestEnemy = this.game.getVisibleClosestUnitOf(
      this.playerNumber,
      unit.position,
      nearbyEnemies
    );

    // Process unit based on strategy properties dynamically
    this.processUnitByStrategy(
      unit,
      closestEnemy,
      strategy,
      targetPosition,
      orders
    );
  }

  private processUnitByStrategy(
    unit: BaseUnit,
    closestEnemy: BaseUnit | null,
    strategy: any,
    targetPosition: Vector2,
    orders: AnyOrder[]
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
        const path = this.getMovementPath(unit, closestEnemy.position);
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
      const enemyGroupType = this.getBotUnitCategory(closestEnemy.category);
      // Find groups that are NOT of the same type as the enemy
      const alternativeGroups = this.enemyGroups.filter(
        (group) => this.getBotUnitCategory(group.category) !== enemyGroupType
      );
      if (alternativeGroups.length > 0) {
        const alternativeTarget = this.getClosestGroup(
          unit.position,
          alternativeGroups
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
      const nearbyEnemies = this.game
        .getVisibleNearbyUnits(
          this.playerNumber,
          unit.position,
          strategy.minDistanceFromEnemies *
            this.gameDataManager.getGameConstants().TILE_SIZE
        )
        .filter((enemy) => enemy.team !== unit.team && !enemy.isRouting());

      if (nearbyEnemies.length > 0) {
        const enemyCenter = this.getClosestGroup(
          unit.position,
          this.enemyGroups
        )?.getCenter();
        if (enemyCenter) {
          const direction = unit.position.subtract(enemyCenter).normalize();
          const retreatPosition = unit.position.add(
            direction.scale(
              strategy.minDistanceFromEnemies *
                this.gameDataManager.getGameConstants().TILE_SIZE
            )
          );
          const path = this.getMovementPath(unit, retreatPosition);
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
    const nearbyEnemies = this.game
      .getVisibleNearbyUnits(
        this.playerNumber,
        unit.position,
        unit.getMaxRange()
      )
      .filter((enemy) => enemy.team !== unit.team && !enemy.isRouting());

    if (nearbyEnemies.length > 0) {
      return; // Stay in position if already in range
    }

    // Default movement towards target
    const path = this.getMovementPath(unit, targetPosition);

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

  private getStrategyForType(groupType: BotUnitCategory) {
    return this._botConfig.strategies[groupType];
  }

  private formGroups(units: BaseUnit[]) {
    const { TILE_SIZE } = this.gameDataManager.getGameConstants();

    const groups: UnitGroup[] = [];

    for (const unit of units) {
      if (unit.isRoutingOrRecovering()) {
        continue;
      }

      let addedToGroup = false;
      const unitGroupType = this.getBotUnitCategory(unit.category);

      for (const group of groups) {
        const groupType = this.getBotUnitCategory(group.category);
        const maxSize = this.getMaxGroupSize(groupType);

        if (
          group.size < maxSize &&
          groupType === unitGroupType &&
          unit.position.distanceTo(group.getCenter()) <=
            TILE_SIZE * this.getGroupCohesion(groupType)
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

  private getClosestGroup(position: Point2, groups: UnitGroup[]) {
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

  private getMovementPath(
    unit: BaseUnit,
    { x: endX, y: endY }: Point2
  ): OrderPathPoint[] {
    const { TILE_SIZE } = this.gameDataManager.getGameConstants();

    const formationDimensions = this.gameDataManager.getUnitDimensions(
      unit.type,
      unit.currentFormation
    );

    const getStepCost = (from: Point2, to: Point2) => {
      const terrain = this.game.map.terrains[to.x][to.y];

      const modifier = this.gameDataManager.getMovementModifier(
        terrain,
        unit.category
      );

      const terrainCost = this._getTerrainCost(modifier);
      const isPassable = this.gameDataManager.isPassable(terrain);

      if (!isPassable) {
        return Infinity;
      }

      // Check for allied units at the target position
      const positionToCheck = {
        x: to.x * TILE_SIZE + TILE_SIZE / 2,
        y: to.y * TILE_SIZE + TILE_SIZE / 2,
      };

      // Use unit's actual height for nearby units search
      const unitHeight = formationDimensions.height;
      const alliedUnits = this.game
        .getNearbyUnits<BaseUnit>(positionToCheck, unitHeight)
        .filter(
          (u) =>
            u.team === unit.team &&
            u.id !== unit.id && // Don't count the unit itself
            !u.isRoutingOrRecovering()
        );

      // Multiply cost if allied unit is present (e.g., multiply by 5)
      const allyCostMultiplier = alliedUnits.length > 0 ? 5 : 1;

      return terrainCost * allyCostMultiplier;
    };

    const tileWidth = this.game.map.terrains.length;
    const tileHeight = this.game.map.terrains[0]?.length ?? 0;
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
    return this.playerNumber;
  }

  /**
   * Gets the team number this bot belongs to.
   * @returns The team number.
   */
  getTeam(): number {
    return this.team;
  }
}
