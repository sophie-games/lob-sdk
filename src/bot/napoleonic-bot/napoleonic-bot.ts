import { IBot, OnBotPlayScript } from "../types";
import { Vector2 } from "@lob-sdk/vector";
import {
  AnyOrder,
  TurnSubmission,
  IServerGame,
  UnitFormationChange,
  ObjectiveType,
} from "@lob-sdk/types";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { BaseUnit } from "@lob-sdk/unit";
import { SkirmisherStrategy } from "./strategies/skirmisher-strategy";
import { ArtilleryStrategy } from "./strategies/artillery-strategy";
import { InfantryStrategy } from "./strategies/infantry-strategy";
import { CavalryStrategy } from "./strategies/cavalry-strategy";
import {
  NapoleonicBotStrategy,
  NapoleonicBotStrategyContext,
  INapoleonicBot,
} from "./types";
import { splitIntoLines } from "./formation-utils";
import { medianPoint } from "../../utils/utils";

/**
 * A bot implementation for Napoleonic era gameplay.
 * Uses unit grouping and strategic decision-making to control units.
 */
export class NapoleonicBot implements INapoleonicBot {
  private _onBotPlayScript: OnBotPlayScript | null = null;
  private _scriptName: string | null = null;
  private _team: number;

  private readonly _strategies: Record<string, NapoleonicBotStrategy>;

  /**
   * Static mapping of unit categories to bot formation groups.
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

    this._strategies = {
      skirmishers: new SkirmisherStrategy(this),
      artillery: new ArtilleryStrategy(this),
      infantry: new InfantryStrategy(this),
      cavalry: new CavalryStrategy(this),
    };
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
        const result = await this._onBotPlayScript(
          this._game,
          this._playerNumber,
        );

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
      formationChanges: [],
    };

    if (myUnits.length === 0) {
      return turnSubmission;
    }

    // Determine if we should retreat based on VP
    const myTeamVp = this._game.getTeamVictoryPoints(this._team);
    const teams = new Set<number>();
    this._game.getPlayers().forEach((p) => {
      teams.add(this._game.getPlayerTeam(p.playerNumber));
    });

    let totalVp = 0;
    teams.forEach((t) => {
      totalVp += this._game.getTeamVictoryPoints(t);
    });
    const avgVp = totalVp / (teams.size || 1);

    // Determine if we should retreat or advance aggressively based on average VP
    // Retreat: 20% less than the average. Advance: 25% more than the average.
    const isLosingBadly = myTeamVp <= avgVp * 0.8;
    const isWinningBig = myTeamVp >= avgVp * 1.25;
    let targetObjectivePos: Vector2 | null = null;
    let enemyBigObjectivePos: Vector2 | null = null;

    const myCentroid = Vector2.fromPoint(
      medianPoint(myUnits.map((u: BaseUnit) => u.position))
    );

    const enemyBigObjective = this.getClosestEnemyBigObjective(myCentroid);
    if (enemyBigObjective) {
      enemyBigObjectivePos = enemyBigObjective.position;
    }

    if (isLosingBadly) {
      // Find our own big objective to retreat to
      const bigObjective = this.getClosestAllyBigObjective(myCentroid);
      if (bigObjective) {
        targetObjectivePos = bigObjective.position;
      }
    } else if (isWinningBig) {
      // Find the best enemy's big objective to advance to
      const enemyBigObjective = this.getClosestEnemyBigObjective(myCentroid);
      if (enemyBigObjective) {
        targetObjectivePos = enemyBigObjective.position;
      }
    }

    // Determine direction towards enemy (always face the target)
    let enemyTargetPos: Vector2;
    if (isWinningBig && targetObjectivePos) {
      enemyTargetPos = targetObjectivePos;
    } else if (enemies.length > 0) {
      enemyTargetPos = Vector2.fromPoint(
        medianPoint(enemies.map((u: BaseUnit) => u.position))
      );
    } else {
      enemyTargetPos = new Vector2(
        this._game.map.width / 2,
        this._game.map.height / 2,
      );
    }

    const direction = enemyTargetPos.subtract(myCentroid).normalize();
    if (direction.isZero()) {
      return turnSubmission;
    }

    const perpendicular = direction.perp();
    const forwardAngle = direction.angle();

    // 2. Group units by category
    const groups = this._groupUnits(myUnits);

    // 3. Determine formation center
    let formationCenter: Vector2;
    if (isLosingBadly && targetObjectivePos) {
      // If retreating, the formation center is offset forward so the rear (at ~160) is at the objective
      const rearDepth = 160;
      formationCenter = targetObjectivePos.add(direction.scale(rearDepth));
    } else if (isWinningBig && targetObjectivePos) {
      // If winning big, the formation center is directly the enemy objective (aggressive advance)
      formationCenter = targetObjectivePos;
    } else {
      // Advance Logic: base the formation center on the furthest skirmisher in the direction of the enemy
      const referenceUnits =
        groups.skirmishers.length > 0 ? groups.skirmishers : myUnits;

      const projections = referenceUnits.map((u: BaseUnit) =>
        u.position.subtract(myCentroid).dot(direction),
      );
      const armyFront = Math.max(...projections);
      const advanceDistance = 64;
      formationCenter = myCentroid.add(
        direction.scale(armyFront + advanceDistance),
      );
    }

    // 4. Calculate positions for each group via strategies
    const orders: AnyOrder[] = [];
    const formationChanges: UnitFormationChange[] = [];
    const infantryLines = splitIntoLines(groups.infantry, 10);
    const mainBodyWidth =
      Math.max(
        groups.skirmishers.length,
        groups.artillery.length,
        infantryLines.length > 0 ? infantryLines[0].length : 0,
      ) * 40; // Default unit spacing for width calculation

    const strategyContext: NapoleonicBotStrategyContext = {
      game: this._game,
      visibleEnemies: enemies,
      allyUnits: myUnits,
      orders,
      formationChanges,
      formationCenter,
      direction,
      perpendicular,
      mainBodyWidth,
      forwardAngle,
      isRetreating: isLosingBadly,
      closestEnemyObjectivePos: enemyBigObjectivePos,
    };

    this._strategies.skirmishers.assignOrders(
      groups.skirmishers,
      strategyContext,
    );

    this._strategies.artillery.assignOrders(groups.artillery, strategyContext);

    this._strategies.infantry.assignOrders(groups.infantry, strategyContext);

    this._strategies.cavalry.assignOrders(groups.cavalry, strategyContext);

    turnSubmission.orders = orders;
    turnSubmission.formationChanges = formationChanges;

    return turnSubmission;
  }

  private _groupUnits(units: BaseUnit[]) {
    const groups: Record<string, BaseUnit[]> = {
      skirmishers: [],
      artillery: [],
      infantry: [],
      cavalry: [],
    };

    units.forEach((unit) => {
      const category = this._gameDataManager
        .getUnitTemplateManager()
        .getTemplate(unit.type).category;

      const groupName = this.getGroup(category);
      if (groupName && groups[groupName]) {
        groups[groupName].push(unit);
      }
    });

    return {
      skirmishers: groups.skirmishers,
      artillery: groups.artillery,
      infantry: groups.infantry,
      cavalry: groups.cavalry,
    };
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

  private _getTerrainCost(movementModifier: number) {
    // Calculate speed factor: 1 is base speed, +modifier increases it, -modifier decreases it
    const speedFactor = 1 + movementModifier; // e.g., +0.5 -> 1.5, -0.5 -> 0.5

    // Cost is inverse of speed: faster = lower cost, slower = higher cost
    const cost = 1 / speedFactor;

    // Round to nearest integer, but allow fractional costs for positive modifiers
    return cost;
  }

  /**
   * Gets the high-level group name for a given unit category.
   * @param categoryId - The unit category ID.
   * @returns The group name (e.g., "infantry", "cavalry").
   */
  getGroup(categoryId: string): string {
    return NapoleonicBot._CATEGORY_TO_GROUP[categoryId] || "";
  }

  /**
   * Gets the player number this bot controls.
   * @returns The player number.
   */
  getPlayerNumber(): number {
    return this._playerNumber;
  }

  /**
   * Gets the game data manager instance.
   */
  getGameDataManager(): GameDataManager {
    return this._gameDataManager;
  }

  /**
   * Gets the team number this bot belongs to.
   * @returns The team number.
   */
  getTeam(): number {
    return this._team;
  }

  getClosestAllyBigObjective(position: Vector2) {
    const objectives = this._game
      .getObjectives()
      .filter((o) => o.team === this._team && o.type === ObjectiveType.Big);

    if (objectives.length === 0) return null;

    return objectives.reduce((prev, curr) => {
      const prevDist = position.squaredDistanceTo(prev.position);
      const currDist = position.squaredDistanceTo(curr.position);
      return currDist < prevDist ? curr : prev;
    });
  }

  getClosestEnemyBigObjective(position: Vector2) {
    const objectives = this._game
      .getObjectives()
      .filter((o) => o.team !== this._team && o.type === ObjectiveType.Big);

    if (objectives.length === 0) return null;

    return objectives.reduce((prev, curr) => {
      const prevDist = position.squaredDistanceTo(prev.position);
      const currDist = position.squaredDistanceTo(curr.position);
      return currDist < prevDist ? curr : prev;
    });
  }

  private static readonly _CATEGORY_TO_GROUP: Record<string, string> = {
    skirmishInfantry: "skirmishers",
    artillery: "artillery",
    infantry: "infantry",
    militiaInfantry: "infantry",
    lightCavalry: "cavalry",
    midCavalry: "cavalry",
    heavyCavalry: "cavalry",
    scoutCavalry: "cavalry",
  };
}
