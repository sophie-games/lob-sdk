import { ShipStrategy } from "./ship-strategy";
import { INapoleonicBot, NapoleonicBotStrategyContext } from "../types";
import { BaseUnit } from "@lob-sdk/unit";
import { Vector2 } from "@lob-sdk/vector";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { IServerGame, OrderType, WalkOrder } from "@lob-sdk/types";

const SHIP_TYPE = 26; // napoleonic "ship" unit template
const DEEP_WATER = 5; // napoleonic "deepWater" terrain id
const MAP_SIZE = 1024;
const TILES = MAP_SIZE / 16;

const gameDataManager = GameDataManager.get("napoleonic");

// All-water map so calculatePath always returns a clear straight path.
const terrains = Array.from({ length: TILES }, () =>
  new Array(TILES).fill(DEEP_WATER),
);
const game = {
  map: { width: MAP_SIZE, height: MAP_SIZE, terrains },
} as unknown as IServerGame;

const bot = {
  getGameDataManager: () => gameDataManager,
} as unknown as INapoleonicBot;

function makeShip(
  id: number,
  x: number,
  y: number,
  currentFormation = "ship",
  range = 500,
  walkMovement = 40,
): BaseUnit {
  return {
    id,
    type: SHIP_TYPE,
    position: new Vector2(x, y),
    currentFormation,
    walkMovement,
    getMaxRange: () => range,
  } as unknown as BaseUnit;
}

function makeContext(
  overrides: Partial<NapoleonicBotStrategyContext> = {},
): NapoleonicBotStrategyContext {
  const direction = new Vector2(0, 1);
  return {
    game,
    visibleEnemies: [],
    myUnits: [],
    allyUnits: [],
    orders: [],
    formationChanges: [],
    formationCenter: new Vector2(512, 512),
    direction,
    perpendicular: direction.perp(),
    mainBodyWidth: 0,
    forwardAngle: direction.angle(),
    isRetreating: false,
    closestEnemyObjectivePos: null,
    ...overrides,
  };
}

describe("ShipStrategy", () => {
  it("issues only legal ship orders (walk or fire-and-advance, never run)", () => {
    const strategy = new ShipStrategy(bot);
    const ships = [makeShip(1, 512, 300), makeShip(2, 560, 300)];
    const context = makeContext({ visibleEnemies: [makeShip(99, 512, 560)] });

    strategy.assignOrders(ships, context);

    expect(context.orders).toHaveLength(2);
    for (const order of context.orders) {
      expect([OrderType.Walk, OrderType.FireAndAdvance]).toContain(order.type);
      expect(order.type).not.toBe(OrderType.Run);
    }
  });

  it("fires and advances when an enemy is in gun range, walks to close otherwise", () => {
    const ship = makeShip(1, 512, 300, "ship", 500);

    const inRange = makeContext({ visibleEnemies: [makeShip(99, 512, 600)] }); // dist 300 <= 500
    new ShipStrategy(bot).assignOrders([ship], inRange);
    expect(inRange.orders[0].type).toBe(OrderType.FireAndAdvance);

    const outOfRange = makeContext({ visibleEnemies: [makeShip(99, 512, 980)] }); // dist 680 > 500
    new ShipStrategy(bot).assignOrders([ship], outOfRange);
    expect(outOfRange.orders[0].type).toBe(OrderType.Walk);
  });

  it("requests the ship formation only for ships not already in it", () => {
    const strategy = new ShipStrategy(bot);
    const inLine = makeShip(1, 500, 300, "line");
    const alreadyShip = makeShip(2, 560, 300, "ship");
    const context = makeContext();

    strategy.assignOrders([inLine, alreadyShip], context);

    expect(context.formationChanges).toContainEqual({
      unitId: 1,
      formationId: "ship",
    });
    expect(
      context.formationChanges.find((c) => c.unitId === 2),
    ).toBeUndefined();
  });

  it("scales the sailing lookahead with each ship's movement speed", () => {
    // With no enemies the standoff center is the formation center, so the order
    // target sits `lookahead` along the line: a proxy for the per-ship reach.
    const reach = (walkMovement: number) => {
      const context = makeContext({ formationCenter: new Vector2(512, 512) });
      const ship = makeShip(1, 512, 512, "ship", 500, walkMovement);
      new ShipStrategy(bot).assignOrders([ship], context);
      const path = (context.orders[0] as WalkOrder).path;
      const target = new Vector2(path[path.length - 1][0], path[path.length - 1][1]);
      return Math.abs(target.subtract(context.formationCenter).dot(context.perpendicular));
    };

    expect(reach(40)).toBeCloseTo(40 * 4);
    expect(reach(80)).toBeCloseTo(80 * 4);
    expect(reach(80)).toBeGreaterThan(reach(40));
  });

  it("walks (never runs) when retreating", () => {
    const strategy = new ShipStrategy(bot);
    const ship = makeShip(1, 512, 300);
    const context = makeContext({
      isRetreating: true,
      visibleEnemies: [makeShip(99, 512, 560)],
    });

    strategy.assignOrders([ship], context);

    expect(context.orders[0].type).toBe(OrderType.Walk);
  });

  it("sails deterministically across instances (no random direction)", () => {
    const run = () => {
      const context = makeContext({
        visibleEnemies: [makeShip(99, 430, 700)],
      });
      new ShipStrategy(bot).assignOrders(
        [makeShip(1, 400, 300), makeShip(2, 460, 300)],
        context,
      );
      return context.orders.map((o) => ({
        type: o.type,
        rotation: (o as { rotation?: number }).rotation,
        path: (o as WalkOrder).path,
      }));
    };

    // Two independent strategies on the same state must issue identical orders.
    expect(run()).toEqual(run());
  });
});
