import { EntityId, OrderType, TerrainCategoryType } from "@lob-sdk/types";
import { BaseUnit } from "@lob-sdk/unit";
import { NapoleonicBotStrategy, NapoleonicBotStrategyContext, INapoleonicBot } from "../types";
import { calculateLinePositions, sortUnitsAlongVector, findPreferredTerrain, calculatePath } from "../formation-utils";
import { KeyedList } from "@lob-sdk/data-structures";

/**
 * Strategy for skirmishers: dynamic based on enemies and stamina.
 */
export class SkirmisherStrategy implements NapoleonicBotStrategy {
  private static readonly UNIT_SPACING = 64;
  private static readonly SEARCH_ENEMY_RANGE = 180;
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
      perpendicular 
    } = context;

    if (this._assignedUnits.hasCompositionChanged(units, u => u.id)) {
      this._assignedUnits.setOrder(sortUnitsAlongVector(units, perpendicular).map(u => u.id));
    }
    this._assignedUnits.sync(units, u => u.id);

    const sortedUnits = this._assignedUnits.getValues();

    const targetPositions = calculateLinePositions(
      sortedUnits,
      formationCenter,
      direction,
      perpendicular,
      0, // Front line
      SkirmisherStrategy.UNIT_SPACING,
      game,
    );

    const gameDataManager = this._bot.getGameDataManager();

    sortedUnits.forEach((unit, i) => {

      const nearbyEnemies = visibleEnemies.filter(
        (e) => unit.position.distanceTo(e.position) <= SkirmisherStrategy.SEARCH_ENEMY_RANGE,
      );

      if (context.isRetreating) {
        let targetPos = targetPositions[i];
        if (!targetPos) return;

        let movesTowardsEnemyObjective = false;
        if (context.closestEnemyObjectivePos) {
          const currentDist = unit.position.distanceTo(context.closestEnemyObjectivePos);
          const targetDist = targetPos.distanceTo(context.closestEnemyObjectivePos);
          movesTowardsEnemyObjective = targetDist < currentDist - 1;
        }

        orders.push({
          id: unit.id,
          type: movesTowardsEnemyObjective ? OrderType.Walk : OrderType.Fallback,
          path: calculatePath(
            unit.position,
            targetPos,
            unit,
            game,
            gameDataManager
          ).map(p => p.toArray()),
          rotation: direction.angle(),
        });
      } else if (nearbyEnemies.length > 0) {
        // Find closest enemy for general targeting
        const closestEnemy = nearbyEnemies.reduce((prev, curr) => 
          unit.position.distanceTo(curr.position) < unit.position.distanceTo(prev.position) ? curr : prev
        );

        // Check if unit is in cover
        const terrain = game.getUnitTerrain(unit);
        const terrainCategory = gameDataManager.getCategoryByTerrain(terrain);
        const isInCover = terrainCategory === TerrainCategoryType.Forest || 
                          terrainCategory === TerrainCategoryType.Building;

        if (isInCover) {
          // Stay where you are and shoot if in cover
          orders.push({
            id: unit.id,
            type: OrderType.Shoot,
            targetId: closestEnemy.id,
          });
        } else {
          // If not in cover, use Fallback Follow order on the closest "core" enemy (non-skirmisher)
          const coreEnemies = nearbyEnemies.filter(e => e.category !== "skirmishInfantry");
          const fallbackTarget = coreEnemies.length > 0 
            ? coreEnemies.reduce((prev, curr) => 
                unit.position.distanceTo(curr.position) < unit.position.distanceTo(prev.position) ? curr : prev
              )
            : closestEnemy;

          orders.push({
            id: unit.id,
            type: OrderType.Fallback,
            targetId: fallbackTarget.id,
          });
        }
      } else {
        // No enemies near, normal movement to assigned slot
        let targetPos = targetPositions[i];
        if (!targetPos) return;

        // Prefers cover (forests, buildings) if nearby
        targetPos = findPreferredTerrain(
          targetPos,
          game,
          gameDataManager,
          this.getTerrainPreference(),
          unit.category,
          4,
        );

        const staminaProportion = unit.getStaminaProportion();
        const orderType = staminaProportion >= 0.75 ? OrderType.Run : OrderType.Walk;

        orders.push({
          id: unit.id,
          type: orderType,
          path: calculatePath(
            unit.position,
            targetPos,
            unit,
            game,
            gameDataManager
          ).map(p => p.toArray()),
          rotation: direction.angle(),
        });
      }

      // Target formation for skirmishers
      const targetFormation = "skirmish";
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
        [TerrainCategoryType.Building]: 1,
        [TerrainCategoryType.Forest]: 2,
        [TerrainCategoryType.Land]: 3,
        [TerrainCategoryType.Path]: 3,
        [TerrainCategoryType.ShallowWater]: 4,
      },
    };
  }
}
