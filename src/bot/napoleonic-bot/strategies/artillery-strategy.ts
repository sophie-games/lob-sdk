import { EntityId, OrderType } from "@lob-sdk/types";
import { BaseUnit } from "@lob-sdk/unit";
import { NapoleonicBotStrategy, NapoleonicBotStrategyContext, INapoleonicBot } from "../types";
import { calculateLinePositions, sortUnitsAlongVector, findPreferredTerrain, calculatePath } from "../formation-utils";
import { TerrainCategoryType } from "@lob-sdk/types";
import { KeyedList } from "@lob-sdk/data-structures";

/**
 * Strategy for artillery: always run to position, but prefer high ground 
 * and stop if in range of enemies.
 */
export class ArtilleryStrategy implements NapoleonicBotStrategy {
  private static readonly UNIT_SPACING = 60; // 40 * 1.5
  private static readonly LINE_SPACING = 32;
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
    } = context;

    if (this._assignedUnits.hasCompositionChanged(units, u => u.id)) {
      this._assignedUnits.setOrder(sortUnitsAlongVector(units, perpendicular).map(u => u.id));
    }
    this._assignedUnits.sync(units, u => u.id);

    const sortedUnits = this._assignedUnits.getValues();

    const baseTargetPositions = calculateLinePositions(
      sortedUnits,
      formationCenter,
      direction,
      perpendicular,
      -ArtilleryStrategy.LINE_SPACING, // Second line (behind skirmishers)
      ArtilleryStrategy.UNIT_SPACING,
      game,
    );

    sortedUnits.forEach((unit, i) => {
      let targetPos = baseTargetPositions[i];
      if (!targetPos) return;

      // 1. Terrain Preference
      targetPos = findPreferredTerrain(
        targetPos,
        game,
        this._bot.getGameDataManager(),
        this.getTerrainPreference(),
        unit.category,
        4,
      );

      let targetRotation = direction.angle();

      // 2. Stop if in range (unless retreating)
      const range = unit.getMaxRange();
      const nearbyEnemies = visibleEnemies.filter(
        (enemy) => unit.position.distanceTo(enemy.position) <= range
      );

      const inRangeOfAnyEnemy = !context.isRetreating && nearbyEnemies.length > 0;

      // If we are already in range, we might want to stay put 
      // instead of moving closer to the formation center.
      if (inRangeOfAnyEnemy) {
        targetPos = unit.position;
      }

      orders.push({
        id: unit.id,
        type: OrderType.Run,
        path: calculatePath(
          unit.position,
          targetPos,
          unit,
          game,
          this._bot.getGameDataManager()
        ).map(p => p.toArray()),
        rotation: targetRotation,
      });

      // Target formation for artillery
      const targetFormation = "artillery";
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
      preferHighGround: true,
      categoryPriority: {
        [TerrainCategoryType.Land]: 1,
        [TerrainCategoryType.Path]: 1,
        [TerrainCategoryType.Forest]: 2,
        [TerrainCategoryType.Building]: 3,
        [TerrainCategoryType.ShallowWater]: 4,
      },
    };
  }
}
