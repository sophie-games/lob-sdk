import { OnBotPlayScript } from "../types";
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
import {
  NapoleonicBotStrategyContext,
  INapoleonicBot,
} from "./types";
import { EntityId } from "@lob-sdk/types";
import { splitIntoLines } from "./formation-utils";
import { medianPoint } from "../../utils/utils";
import { ArmyGroup } from "./army-group";

/**
 * A bot implementation for Napoleonic era gameplay.
 * Uses unit grouping and strategic decision-making to control units.
 */
export class NapoleonicBot implements INapoleonicBot {
  private _onBotPlayScript: OnBotPlayScript | null = null;
  private _scriptName: string | null = null;
  private _team: number;

  private _armyGroups: ArmyGroup[] = [];

  /** Max distance (world units) for units to be considered part of the same army group; used for clustering and assigning unassigned units. */
  private static readonly ARMY_GROUP_DISTANCE_THRESHOLD = 160;
  /** Offset so formation rear sits at the retreat objective when retreating. */
  private static readonly RETREAT_REAR_DEPTH = 160;
  /** Retreat when team VP <= average × this. */
  private static readonly VP_RATIO_RETREAT = 0.8;
  /** Advance aggressively when team VP >= average × this. */
  private static readonly VP_RATIO_ADVANCE = 1.25;
  /** Max infantry units per line. */
  private static readonly INFANTRY_MAX_PER_LINE = 10;
  /** Unit spacing used for main body width calculation. */
  private static readonly MAIN_BODY_UNIT_SPACING = 40;
  /** Default advance distance when no units. */
  private static readonly ADVANCE_DISTANCE_DEFAULT = 64;
  /** Cap on advance distance (movement-based). */
  private static readonly ADVANCE_DISTANCE_CAP = 48;
  /** Extra forward offset when infantry present. */
  private static readonly ANCHOR_OFFSET_INFANTRY = 96;
  /** Extra forward offset when artillery (no infantry). */
  private static readonly ANCHOR_OFFSET_ARTILLERY = 32;
  /** Extra forward offset when cavalry only. */
  private static readonly ANCHOR_OFFSET_CAVALRY = 160;

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
    const allyUnits = this._getAllyUnits();
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

    this._maintainArmyGroups(myUnits);

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
    const isLosingBadly = myTeamVp <= avgVp * NapoleonicBot.VP_RATIO_RETREAT;
    const isWinningBig = myTeamVp >= avgVp * NapoleonicBot.VP_RATIO_ADVANCE;

    const orders: AnyOrder[] = [];
    const formationChanges: UnitFormationChange[] = [];

    this._armyGroups.forEach(armyGroup => {
      const groupUnits = myUnits.filter(u => armyGroup.hasUnit(u.id));
      if (groupUnits.length === 0) return;

      let targetObjectivePos: Vector2 | null = null;
      let enemyBigObjectivePos: Vector2 | null = null;

      const myCentroid = Vector2.fromPoint(
        medianPoint(groupUnits.map((u: BaseUnit) => u.position))
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
        const enemyBigObj = this.getClosestEnemyBigObjective(myCentroid);
        if (enemyBigObj) {
          targetObjectivePos = enemyBigObj.position;
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
        return;
      }

      const perpendicular = direction.perp();
      const forwardAngle = direction.angle();

      // 2. Group units by category
      const groups = this._groupUnits(groupUnits);

      // 3. Determine formation center
      let formationCenter: Vector2;
      if (isLosingBadly && targetObjectivePos) {
        // If retreating, the formation center is offset forward so the rear is at the objective
        formationCenter = targetObjectivePos.add(
          direction.scale(NapoleonicBot.RETREAT_REAR_DEPTH),
        );
      } else if (isWinningBig && targetObjectivePos) {
        // If winning big, the formation center is directly the enemy objective (aggressive advance)
        formationCenter = targetObjectivePos;
      } else {
        // Advance Logic: base the formation center on the furthest skirmisher in the direction of the enemy
        const referenceUnits =
          groups.skirmishers.length > 0 ? groups.skirmishers : groupUnits;

        const projections = referenceUnits.map((u: BaseUnit) =>
          u.position.subtract(myCentroid).dot(direction),
        );
        const armyFront = Math.max(...projections);
        
        formationCenter = this.calculateAdvanceFormationCenter(
          myCentroid,
          direction,
          armyFront,
          groupUnits,
          groups,
        );
      }

      // 4. Calculate positions for each group via strategies
      const infantryLines = splitIntoLines(
        groups.infantry,
        NapoleonicBot.INFANTRY_MAX_PER_LINE,
      );
      const mainBodyWidth =
        Math.max(
          groups.skirmishers.length,
          groups.artillery.length,
          infantryLines.length > 0 ? infantryLines[0].length : 0,
        ) * NapoleonicBot.MAIN_BODY_UNIT_SPACING;

      const strategyContext: NapoleonicBotStrategyContext = {
        game: this._game,
        visibleEnemies: enemies,
        myUnits,
        allyUnits,
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

      armyGroup.strategies.skirmishers.assignOrders(groups.skirmishers, strategyContext);
      armyGroup.strategies.artillery.assignOrders(groups.artillery, strategyContext);
      armyGroup.strategies.infantry.assignOrders(groups.infantry, strategyContext);
      armyGroup.strategies.cavalry.assignOrders(groups.cavalry, strategyContext);
    });

    turnSubmission.orders = orders;
    turnSubmission.formationChanges = formationChanges;

    return turnSubmission;
  }

  /**
   * Keeps {@link _armyGroups} in sync with the current set of units.
   *
   * 1. **Cleanup**: Removes from each group any unit that no longer exists (e.g. dead).
   *    Drops army groups that end up with no units.
   *
   * 2. **Reassign unassigned units**: Finds units that are not in any group. For each
   *    such unit, tries to add it to an existing group if it is within
   *    {@link ARMY_GROUP_DISTANCE_THRESHOLD} of any unit in that group (first matching
   *    group wins).
   *
   * 3. **New groups from clusters**: Units that still have no group are clustered by
   *    proximity (two units are in the same cluster if within
   *    {@link ARMY_GROUP_DISTANCE_THRESHOLD}). Each cluster becomes a new
   *    {@link ArmyGroup} and is appended to {@link _armyGroups}.
   *
   * @param units - All units (e.g. from the current game state) used to build the
   *   current unit set and to resolve unassigned units.
   */
  private _maintainArmyGroups(units: BaseUnit[]) {
    const currentUnitMap = new Map<EntityId, BaseUnit>();
    units.forEach(u => currentUnitMap.set(u.id, u));

    this._removeDeadUnits(currentUnitMap);

    this._armyGroups = this._armyGroups.filter(g => g.size > 0);

    const assignedUnitIds = new Set<EntityId>();
    this._armyGroups.forEach((group) => {
      group.getUnits().forEach((id) => assignedUnitIds.add(id));
    });
    const unassignedUnits = units.filter((u) => !assignedUnitIds.has(u.id));

    if (unassignedUnits.length === 0) return;

    const stillUnassigned: BaseUnit[] = [];
    unassignedUnits.forEach(unit => {
      let joined = false;
      for (const group of this._armyGroups) {
        const groupUnits = group.getUnits().map(id => currentUnitMap.get(id)).filter(u => u !== undefined) as BaseUnit[];
        const isClose = groupUnits.some(
          (gu) =>
            gu.position.distanceTo(unit.position) <=
            NapoleonicBot.ARMY_GROUP_DISTANCE_THRESHOLD,
        );
        if (isClose) {
          group.addUnit(unit.id);
          joined = true;
          break;
        }
      }
      if (!joined) {
        stillUnassigned.push(unit);
      }
    });

    if (stillUnassigned.length > 0) {
      this._createNewGroupsFromClusters(stillUnassigned);
    }
  }

  /**
   * Clusters unassigned units by proximity (within {@link ARMY_GROUP_DISTANCE_THRESHOLD})
   * and creates a new {@link ArmyGroup} for each cluster, appending them to
   * {@link _armyGroups}.
   *
   * @param stillUnassigned - Units that are not in any existing army group.
   */
  private _createNewGroupsFromClusters(stillUnassigned: BaseUnit[]) {
    const clusters: BaseUnit[][] = [];
    const visited = new Set<EntityId>();

    stillUnassigned.forEach(unit => {
      if (visited.has(unit.id)) return;

      const cluster: BaseUnit[] = [];
      const queue: BaseUnit[] = [unit];
      visited.add(unit.id);

      while (queue.length > 0) {
        const current = queue.shift()!;
        cluster.push(current);

        stillUnassigned.forEach((other) => {
          if (
            !visited.has(other.id) &&
            current.position.distanceTo(other.position) <=
              NapoleonicBot.ARMY_GROUP_DISTANCE_THRESHOLD
          ) {
            visited.add(other.id);
            queue.push(other);
          }
        });
      }
      clusters.push(cluster);
    });

    clusters.forEach(cluster => {
      const group = new ArmyGroup(this);
      cluster.forEach(u => group.addUnit(u.id));
      this._armyGroups.push(group);
    });
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

  private _getAllyUnits() {
    return this._game
      .getUnits()
      .filter((unit) => unit.team === this._team);
  }

  private _getEnemyUnits() {
    // Use fog of war filtered method to only see visible enemy units
    return this._game.getVisibleEnemyUnits(this._playerNumber);
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

  /**
   * Computes the formation center when the army is advancing (not retreating and not "winning big").
   * Places the formation in front of the army based on the furthest forward units and unit-type-specific offsets.
   *
   * @param myCentroid - Center of the army group.
   * @param direction - Normalized direction toward the enemy.
   * @param armyFront - Projection of the front units along direction (from centroid).
   * @param groupUnits - All units in the group.
   * @param groups - Units grouped by category (skirmishers, artillery, infantry, cavalry).
   * @returns World position of the formation center.
   *
   * Advance distance is derived from the slowest unit movement (artillery/skirmisher/infantry rules), then capped.
   * An anchor offset is applied depending on whether infantry, artillery, or cavalry dominate.
   * Result: myCentroid + direction × (armyFront + advanceDistance + anchorOffset).
   */
  public calculateAdvanceFormationCenter(
    myCentroid: Vector2,
    direction: Vector2,
    armyFront: number,
    groupUnits: BaseUnit[],
    groups: Record<string, BaseUnit[]>,
  ): Vector2 {
    let advanceDistance = NapoleonicBot.ADVANCE_DISTANCE_DEFAULT;
    if (groupUnits.length > 0) {
      advanceDistance = Math.min(
        ...groupUnits.map((u) => {
          const category = this._gameDataManager
            .getUnitTemplateManager()
            .getTemplate(u.type).category;
          const groupName = this.getGroup(category);

          if (groupName === "artillery") {
            return u.runMovement || u.walkMovement;
          } else if (groupName === "skirmishers") {
            return u.getStaminaProportion() >= 0.75
              ? u.runMovement || u.walkMovement
              : u.walkMovement;
          }
          return u.walkMovement;
        }),
      );
      advanceDistance = Math.min(
        advanceDistance,
        NapoleonicBot.ADVANCE_DISTANCE_CAP,
      );
    }
    let anchorOffset = 0;
    if (groups.infantry.length > 0) anchorOffset = NapoleonicBot.ANCHOR_OFFSET_INFANTRY;
    else if (groups.artillery.length > 0) anchorOffset = NapoleonicBot.ANCHOR_OFFSET_ARTILLERY;
    else if (groups.cavalry.length > 0) anchorOffset = NapoleonicBot.ANCHOR_OFFSET_CAVALRY;

    return myCentroid.add(
      direction.scale(armyFront + advanceDistance + anchorOffset),
    );
  }

  private _removeDeadUnits(currentUnitMap: Map<EntityId, BaseUnit>) {
    this._armyGroups.forEach((group) => {
      for (const id of group.getUnits()) {
        if (!currentUnitMap.has(id)) {
          group.removeUnit(id);
        }
      }
    });
  }
}
