import {
  EntityId,
  OrderType,
  TerrainCategoryType,
  IServerGame,
  UnitFormationChange,
} from "@lob-sdk/types";
import { BaseUnit } from "@lob-sdk/unit";
import { Vector2 } from "@lob-sdk/vector";
import { KeyedList } from "@lob-sdk/data-structures";
import {
  NapoleonicBotStrategy,
  NapoleonicBotStrategyContext,
  INapoleonicBot,
} from "../types";
import { sortUnitsAlongVector, calculatePath, clampToMap } from "../formation-utils";

/**
 * Strategy for ships: line of battle. Ships fire broadside (+/-90deg) and cannot
 * pivot in place, so they must keep making way to aim. Sails the squadron along
 * a line at standoff range, broadside to the enemy, firing via FireAndAdvance;
 * the line reverses course near the map edge.
 */
export class ShipStrategy implements NapoleonicBotStrategy {
  /** Hold station at this fraction of each ship's max gun range. */
  private static readonly STANDOFF_RANGE_FACTOR = 0.8;
  /** Sail this many turns of movement ahead along the line, to keep making way. */
  private static readonly LOOKAHEAD_TURNS = 4;
  /** Wear the line when within this many turns of movement from the map edge. */
  private static readonly EDGE_MARGIN_TURNS = 2.5;

  private _assignedUnits = new KeyedList<EntityId, BaseUnit>();
  /**
   * Sailing direction along the line (+1 / -1); also selects which broadside the
   * squadron presents, and flips at the map edge. Shared by the whole squadron so
   * the line stays coherent (opposite signs would sail into each other). Seeded
   * deterministically from the squadron's position on first use (0 = unseeded),
   * so the bot stays replay-stable.
   */
  private _sailSign = 0;

  constructor(private _bot: INapoleonicBot) {}

  assignOrders(units: BaseUnit[], context: NapoleonicBotStrategyContext): void {
    if (units.length === 0) return;

    const {
      game,
      visibleEnemies,
      orders,
      formationChanges,
      direction,
      perpendicular,
      formationCenter,
      isRetreating,
    } = context;

    // Stable left-to-right ordering along the line for deterministic stations.
    if (this._assignedUnits.hasCompositionChanged(units, (u) => u.id)) {
      this._assignedUnits.setOrder(
        sortUnitsAlongVector(units, perpendicular).map((u) => u.id),
      );
    }
    this._assignedUnits.sync(units, (u) => u.id);
    const ships = this._assignedUnits.getValues();

    // Hold the line (along `perpendicular`) at standoff range from the enemy.
    const lineAxis = perpendicular;
    const enemyCentroid =
      visibleEnemies.length > 0 ? this._centroid(visibleEnemies) : null;
    const standoff =
      this._avg(ships, (u) => u.getMaxRange()) *
      ShipStrategy.STANDOFF_RANGE_FACTOR;
    const standoffCenter = enemyCentroid
      ? enemyCentroid.subtract(direction.scale(standoff))
      : formationCenter;

    const sailSign = this._chooseSailSign(ships, lineAxis, game);
    const heading = lineAxis.scale(sailSign).angle();

    ships.forEach((unit) => {
      if (isRetreating) {
        // Disengage toward the formation center; no broadside keeping.
        orders.push({
          id: unit.id,
          type: OrderType.Walk,
          path: this._pathTo(unit, formationCenter, game),
        });
        this._ensureShipFormation(unit, formationChanges);
        return;
      }

      // Pull onto the standoff line, then push along it so the ship keeps way.
      const alongLine = unit.position.subtract(standoffCenter).dot(lineAxis);
      const lookahead = unit.walkMovement * ShipStrategy.LOOKAHEAD_TURNS;
      const target = clampToMap(
        standoffCenter.add(lineAxis.scale(alongLine + sailSign * lookahead)),
        game,
      );

      const enemyInRange = visibleEnemies.some(
        (e) => unit.position.distanceTo(e.position) <= unit.getMaxRange(),
      );

      orders.push({
        id: unit.id,
        // In range: fire while sailing. Out of range: close the distance.
        type: enemyInRange ? OrderType.FireAndAdvance : OrderType.Walk,
        path: this._pathTo(unit, target, game),
        rotation: heading,
      });
      this._ensureShipFormation(unit, formationChanges);
    });
  }

  getTerrainPreference() {
    return {
      preferHighGround: false,
      categoryPriority: {
        [TerrainCategoryType.DeepWater]: 1,
      },
    };
  }

  private _pathTo(unit: BaseUnit, target: Vector2, game: IServerGame) {
    return calculatePath(
      unit.position,
      target,
      unit,
      game,
      this._bot.getGameDataManager(),
    ).map((p) => p.toArray());
  }

  private _ensureShipFormation(
    unit: BaseUnit,
    formationChanges: UnitFormationChange[],
  ): void {
    if (unit.currentFormation !== "ship") {
      formationChanges.push({ unitId: unit.id, formationId: "ship" });
    }
  }

  private _centroid(units: BaseUnit[]): Vector2 {
    const sum = units.reduce(
      (acc, u) => acc.add(u.position),
      new Vector2(0, 0),
    );
    return sum.scale(1 / units.length);
  }

  private _avg(units: BaseUnit[], selector: (u: BaseUnit) => number): number {
    return units.reduce((acc, u) => acc + selector(u), 0) / units.length;
  }

  /** Sailing direction along the line, reversed when nearing the map edge. */
  private _chooseSailSign(
    ships: BaseUnit[],
    lineAxis: Vector2,
    game: IServerGame,
  ): number {
    const centroid = this._centroid(ships);
    const avgWalk = this._avg(ships, (u) => u.walkMovement);
    const margin = avgWalk * ShipStrategy.EDGE_MARGIN_TURNS;
    const inBounds = (p: Vector2) =>
      p.x > margin &&
      p.x < game.map.width - margin &&
      p.y > margin &&
      p.y < game.map.height - margin;

    const probe = (s: number) =>
      centroid.add(
        lineAxis.scale(s * avgWalk * ShipStrategy.LOOKAHEAD_TURNS * 2),
      );

    if (this._sailSign === 0) {
      // Seed once: sail toward the map center along the line, so the squadron
      // keeps making way before it has to wear at an edge.
      const center = new Vector2(game.map.width / 2, game.map.height / 2);
      const offsetAlongLine = centroid.subtract(center).dot(lineAxis);
      this._sailSign = offsetAlongLine > 0 ? -1 : 1;
    }

    if (!inBounds(probe(this._sailSign)) && inBounds(probe(-this._sailSign))) {
      this._sailSign = -this._sailSign;
    }
    return this._sailSign;
  }
}
