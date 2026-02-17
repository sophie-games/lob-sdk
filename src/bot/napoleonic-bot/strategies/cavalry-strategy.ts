import { EntityId, OrderType, TerrainCategoryType } from "@lob-sdk/types";
import { BaseUnit } from "@lob-sdk/unit";
import { NapoleonicBotStrategy, NapoleonicBotStrategyContext, INapoleonicBot } from "../types";
import { Vector2 } from "@lob-sdk/vector";
import { calculateFlankPositions, splitCavalry, sortUnitsAlongVector, calculatePath, findPreferredTerrain } from "../formation-utils";
import { KeyedList } from "@lob-sdk/data-structures";

/**
 * Strategy for cavalry: flank protection.
 */
export class CavalryStrategy implements NapoleonicBotStrategy {
  private static readonly UNIT_SPACING = 40;
  private static readonly LINE_SPACING = 32;
  private static readonly REAR_OFFSET = -160; // Behind infantry
  private static readonly MAX_CHARGE_DISTANCE = 600;
  private static readonly INFANTRY_LINE_RADIUS = 400;
  private static readonly MAX_CHARGERS_PER_TARGET = 2;
  private static readonly OBSTACLE_RADIUS = 40;
  private static readonly ISOLATION_RADIUS = 250;
  private _assignedUnits = new KeyedList<EntityId, BaseUnit>();

  constructor(private _bot: INapoleonicBot) {}

  assignOrders(
    units: BaseUnit[],
    context: NapoleonicBotStrategyContext,
  ): void {
    const { 
      game, 
      visibleEnemies,
      orders, 
      formationChanges, 
      formationCenter, 
      direction, 
      perpendicular, 
      mainBodyWidth 
    } = context;

    if (this._assignedUnits.hasCompositionChanged(units, u => u.id)) {
      this._assignedUnits.setOrder(sortUnitsAlongVector(units, perpendicular).map(u => u.id));
    }
    this._assignedUnits.sync(units, u => u.id);

    const sortedUnits = this._assignedUnits.getValues();
    const cavalrySplit = splitCavalry(sortedUnits);
    
    // Left Flank
    const leftPositions = calculateFlankPositions(
      cavalrySplit.left,
      formationCenter,
      direction,
      perpendicular,
      -mainBodyWidth / 2 - CavalryStrategy.UNIT_SPACING,
      CavalryStrategy.LINE_SPACING,
      game,
      2,
      CavalryStrategy.REAR_OFFSET
    );

    const allCavalry = sortedUnits;
    const chargeAssignments = new Map<EntityId, BaseUnit>();
    const chargerCounts = new Map<EntityId, number>();

    if (!context.isRetreating) {
      const potentialCharges = this._getPotentialCharges(
        allCavalry,
        visibleEnemies,
        formationCenter,
      );

      for (const charge of potentialCharges) {
        const unitId = charge.unit.id;
        const targetId = charge.target.id;

        if (chargeAssignments.has(unitId)) continue;

        const count = chargerCounts.get(targetId) || 0;
        if (count < CavalryStrategy.MAX_CHARGERS_PER_TARGET) {
          chargeAssignments.set(unitId, charge.target);
          chargerCounts.set(targetId, count + 1);
        }
      }
    }

    this._assignFlankOrders(
      cavalrySplit.left,
      leftPositions,
      chargeAssignments,
      context,
    );

    // Right Flank
    const rightPositions = calculateFlankPositions(
      cavalrySplit.right,
      formationCenter,
      direction,
      perpendicular,
      mainBodyWidth / 2 + CavalryStrategy.UNIT_SPACING,
      CavalryStrategy.LINE_SPACING,
      game,
      2,
      CavalryStrategy.REAR_OFFSET
    );

    this._assignFlankOrders(
      cavalrySplit.right,
      rightPositions,
      chargeAssignments,
      context,
    );
  }

  private _assignFlankOrders(
    units: BaseUnit[],
    positions: Vector2[],
    chargeAssignments: Map<EntityId, BaseUnit>,
    context: NapoleonicBotStrategyContext,
  ): void {
    const { game, orders, formationChanges, direction } = context;

    units.forEach((unit, i) => {
      const assignedTarget = chargeAssignments.get(unit.id);
      let targetPos = positions[i];
      let orderType: OrderType = OrderType.Walk;
      let targetRotation = direction.angle();

      // Refers to the current AI retreating
      if (context.isRetreating) {
        let movesTowardsEnemyObjective = false;
        if (context.closestEnemyObjectivePos && targetPos) {
          const currentDist = unit.position.distanceTo(
            context.closestEnemyObjectivePos,
          );
          const targetDist = targetPos.distanceTo(
            context.closestEnemyObjectivePos,
          );
          movesTowardsEnemyObjective = targetDist < currentDist - 1;
        }
        orderType = movesTowardsEnemyObjective
          ? OrderType.Walk
          : OrderType.Fallback;
      } else if (assignedTarget) {
        targetPos = assignedTarget.position;
        orderType = OrderType.Run;
        targetRotation = targetPos.subtract(unit.position).angle();
      }

      if (!targetPos) return;

      if (assignedTarget) {
        orders.push({
          id: unit.id,
          type: OrderType.Run,
          targetId: assignedTarget.id,
        });
      } else {
        if (targetPos && !context.isRetreating) {
          targetPos = findPreferredTerrain(
            targetPos,
            game,
            this._bot.getGameDataManager(),
            this.getTerrainPreference(),
            3,
          );
        }
        orders.push({
          id: unit.id,
          type: orderType,
          path: calculatePath(
            unit.position,
            targetPos,
            unit,
            game,
            this._bot.getGameDataManager(),
          ).map((p) => p.toArray()),
          rotation: targetRotation,
        });
      }

      // Target formation for cavalry
      const targetFormation = "line";
      if (unit.currentFormation !== targetFormation) {
        formationChanges.push({
          unitId: unit.id,
          formationId: targetFormation,
        });
      }
    });
  }

  getTerrainPreference() {
    return {
      preferHighGround: false,
      categoryPriority: {
        [TerrainCategoryType.Land]: 1,
        [TerrainCategoryType.Path]: 1,
        [TerrainCategoryType.Forest]: 2,
        [TerrainCategoryType.Building]: 3,
        [TerrainCategoryType.ShallowWater]: 4,
      },
    };
  }

  private _getPotentialCharges(
    myUnits: BaseUnit[],
    visibleEnemies: BaseUnit[],
    formationCenter: Vector2,
  ): { unit: BaseUnit; target: BaseUnit; dist: number }[] {
    const potentialCharges: { unit: BaseUnit; target: BaseUnit; dist: number }[] =
      [];

    for (const unit of myUnits) {
      for (const enemy of visibleEnemies) {
        const dist = unit.position.distanceTo(enemy.position);
        if (dist > CavalryStrategy.MAX_CHARGE_DISTANCE) continue;

        if (
          this._isPriorityTarget(
            unit,
            enemy,
            formationCenter,
            visibleEnemies,
          ) &&
          !this._isPathBlocked(unit, enemy, visibleEnemies)
        ) {
          potentialCharges.push({ unit, target: enemy, dist });
        }
      }
    }

    // Sort by distance to prioritize closer charges
    return potentialCharges.sort((a, b) => a.dist - b.dist);
  }

  private _isPriorityTarget(unit: BaseUnit, enemy: BaseUnit, formationCenter: Vector2, visibleEnemies: BaseUnit[]): boolean {
    const enemyGroup = this._bot.getGroup(enemy.category);

    // 1. Enemy cav near infantry line
    if (enemyGroup === "cavalry") {
      const distToFormation = enemy.position.distanceTo(formationCenter);
      if (distToFormation < CavalryStrategy.INFANTRY_LINE_RADIUS) {
        return true;
      }
    }

    // 2. Weak enemy infantry or isolated support
    const isWeakInfantry = enemyGroup === "infantry" && enemy.getOrgProportion() <= unit.getOrgProportion() - 0.3;
    if (isWeakInfantry || 
        enemyGroup === "artillery" || 
        enemyGroup === "skirmishers") {
      
      if (enemy.isRouting()) {
        // If routing, only charge if isolated from non-routing allies
        const isSupported = visibleEnemies.some(other => {
          if (other.id === enemy.id || other.player !== enemy.player) return false;
          if (other.isRouting()) return false;
          return other.position.distanceTo(enemy.position) <= CavalryStrategy.ISOLATION_RADIUS;
        });

        if (isSupported) return false;
      } else if (enemyGroup === "artillery" || enemyGroup === "skirmishers") {
        // If it's a healthy support unit, still check if it's isolated from main combat units
        const isSupported = visibleEnemies.some(other => {
          if (other.id === enemy.id || other.player !== enemy.player) return false;
          if (other.isRouting()) return false;
          const oGroup = this._bot.getGroup(other.category);
          if (oGroup !== "infantry" && oGroup !== "cavalry") return false;
          return other.position.distanceTo(enemy.position) <= CavalryStrategy.ISOLATION_RADIUS;
        });
        
        if (isSupported) return false;
      }
      
      return true;
    }

    return false;
  }

  private _isPathBlocked(unit: BaseUnit, target: BaseUnit, enemies: BaseUnit[]): boolean {
    for (const enemy of enemies) {
      if (enemy.id === target.id) continue;

      const enemyGroup = this._bot.getGroup(enemy.category);
      // "Solid" units: infantry with relative org parity or better
      const isSolid = enemyGroup === "infantry" && enemy.getOrgProportion() > unit.getOrgProportion() - 0.3;

      if (isSolid) {
        const dist = this._distanceToSegment(enemy.position, unit.position, target.position);
        if (dist < CavalryStrategy.OBSTACLE_RADIUS) {
          return true;
        }
      }
    }
    return false;
  }

  private _distanceToSegment(p: Vector2, a: Vector2, b: Vector2): number {
    const l2 = a.squaredDistanceTo(b);
    if (l2 === 0) return p.distanceTo(a);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = new Vector2(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y));
    return p.distanceTo(projection);
  }
}
