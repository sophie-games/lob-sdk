import { BaseUnit } from "./base-unit";
import { Vector2 } from "@lob-sdk/vector";
import {
  OrderType,
  UnitCategoryId,
  UnitStatus,
  UnitTemplate,
  UnitType,
} from "@lob-sdk/types";
import { Polygon } from "@lob-sdk/shapes";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { BeenInMelee, Rotated180 } from "@lob-sdk/unit-effects";
import { Direction } from "@lob-sdk/types";

describe("BaseUnit", () => {
  const gameDataManager = GameDataManager.get("napoleonic");
  const { stamina } = gameDataManager.getGameRules();

  if (!stamina) {
    throw new Error(`Stamina rules are not defined for ${gameDataManager.era}`);
  }

  const template = gameDataManager.getUnitTemplateManager().getTemplate(1); // LineInfantry
  const categoryTemplate = gameDataManager.getUnitCategoryTemplate("infantry");

  class TestUnit extends BaseUnit {
    player = 1;
    team = 1;
    hp: number = 800;
    org: number = 500;
    stamina: number | null = template.stamina ?? null;
    ammo: number = 0;
    supply: number | null = null;
    position: Vector2 = new Vector2(0, 0);
    category: UnitCategoryId = "infantry";
    type: UnitType = 1; // LineInfantry
    public template: UnitTemplate = template;
    protected categoryTemplate = categoryTemplate;
    public effects: Map<number, any> = (this as any).effects;
    accumulatedRun: number = 0;
    rotation: number = 0;
    hardAllyOverlap: number = 0;
    softAllyOverlap: number = 0;
    holdFireDamageTypes: number[] = [];
    entrenchment: number = 0;
    status = UnitStatus.Standing;
    currentFormation: string = "column";
    pendingFormationId: string | null = null;
    formationChangeTicksRemaining: number = 0;
    cannotChangeFormation = false;
    cannotCharge = false;
    reorgDebuff = 0;

    getPolygon() {
      return 0 as unknown as Polygon;
    }

    isMoving() {
      return false;
    }

    inMelee(): boolean {
      return false;
    }
  }

  let unit: TestUnit;

  beforeEach(() => {
    const id = 10;
    unit = new TestUnit(id, gameDataManager);
  });

  describe("hasEffect()", () => {
    it("should return true if the effect exists", () => {
      unit.effects.set(Rotated180.id, new Rotated180(10));
      expect(unit.hasEffect(Rotated180.id)).toBe(true);
    });

    it("should return false if the effect does not exist", () => {
      expect(unit.hasEffect(BeenInMelee.id)).toBe(false);
    });

    it("should return true if the effect exists and has enough ticks", () => {
      unit.effects.set(Rotated180.id, new Rotated180(10));
      expect(unit.hasEffect(Rotated180.id, 5)).toBe(true);
    });

    it("should return false if the effect exists but does not have enough ticks", () => {
      unit.effects.set(BeenInMelee.id, new BeenInMelee(3, 0));
      expect(unit.hasEffect(BeenInMelee.id, 5)).toBe(false);
    });

    it("should return false if the effect does not exist, regardless of inTicks", () => {
      expect(unit.hasEffect(Rotated180.id, 5)).toBe(false);
    });

    it("should handle zero ticks as a valid check", () => {
      unit.effects.set(Rotated180.id, new Rotated180(0));
      expect(unit.hasEffect(Rotated180.id, 0)).toBe(true);
    });
  });

  describe("isRunning()", () => {
    it("should return true when stamina proportion is above STAMINA_LOWER_MODIFIER_LIMIT, order is Run, and accumulatedRun >= timeToRun", () => {
      unit.stamina = unit.maxStamina * (stamina.lowerModifierLimit + 0.1);
      const activeOrder = OrderType.Run;
      unit.accumulatedRun = unit.timeToRun;
      expect(unit.isRunning(activeOrder)).toBe(true);
    });

    it("should return false when stamina proportion is equal to STAMINA_LOWER_MODIFIER_LIMIT", () => {
      unit.stamina = unit.maxStamina * stamina.lowerModifierLimit;
      const activeOrder = OrderType.Run;
      unit.accumulatedRun = unit.timeToRun;
      expect(unit.isRunning(activeOrder)).toBe(false);
    });

    it("should return false when stamina proportion is below STAMINA_LOWER_MODIFIER_LIMIT", () => {
      unit.stamina = unit.maxStamina * (stamina.lowerModifierLimit - 0.01);
      const activeOrder = OrderType.Run;
      unit.accumulatedRun = unit.timeToRun;
      expect(unit.isRunning(activeOrder)).toBe(false);
    });

    it("should return false when order is not Run, even if stamina is above limit and accumulatedRun >= timeToRun", () => {
      unit.stamina = unit.maxStamina * (stamina.lowerModifierLimit + 0.1);
      const activeOrder = OrderType.Walk;
      unit.accumulatedRun = unit.timeToRun;
      expect(unit.isRunning(activeOrder)).toBe(false);
    });

    it("should return false when accumulatedRun is less than timeToRun, even if stamina is above limit and order is Run", () => {
      unit.stamina = unit.maxStamina * (stamina.lowerModifierLimit + 0.1);
      const activeOrder = OrderType.Run;
      unit.accumulatedRun = unit.timeToRun - 1;
      expect(unit.isRunning(activeOrder)).toBe(false);
    });
  });

  describe("getDirectionToPoint() with flexible arcs", () => {
    it("returns Front for points within custom front/back arc", () => {
      unit.rotation = 0;
      // 180 degree arc (PI) for both front and back
      const frontBackArc = Math.PI;
      // Point directly in front
      expect(unit.getDirectionToPoint(new Vector2(10, 0), frontBackArc)).toBe(
        Direction.Front
      );
      // Point at 89 degrees (just inside front arc)
      const angle = (frontBackArc / 2) * 0.99;
      expect(
        unit.getDirectionToPoint(
          new Vector2(Math.cos(angle) * 10, Math.sin(angle) * 10),
          frontBackArc
        )
      ).toBe(Direction.Front);
    });

    it("returns Back for points within custom back arc", () => {
      unit.rotation = 0;
      // Use a wide arc so back detection is generous
      const frontBackArc = Math.PI;
      // Point directly behind
      expect(unit.getDirectionToPoint(new Vector2(-10, 0), frontBackArc)).toBe(
        Direction.Back
      );
      // Point at 179 degrees (just inside back arc)
      const angle = Math.PI - (frontBackArc / 2) * 0.99;
      expect(
        unit.getDirectionToPoint(
          new Vector2(Math.cos(angle) * 10, Math.sin(angle) * 10),
          frontBackArc
        )
      ).toBe(Direction.Back);
    });

    it("returns Right for points in right flank with custom arcs", () => {
      unit.rotation = 0;
      const frontBackArc = Math.PI / 2;
      // Point at 60 degrees (right flank)
      const angle = Math.PI / 3;
      expect(
        unit.getDirectionToPoint(
          new Vector2(Math.cos(angle) * 10, Math.sin(angle) * 10),
          frontBackArc
        )
      ).toBe(Direction.Right);
    });

    it("returns Left for points in left flank with custom arcs", () => {
      unit.rotation = 0;
      const frontBackArc = Math.PI / 2;
      // Point at 240 degrees (left flank)
      const angle = (4 * Math.PI) / 3;
      expect(
        unit.getDirectionToPoint(
          new Vector2(Math.cos(angle) * 10, Math.sin(angle) * 10),
          frontBackArc
        )
      ).toBe(Direction.Left);
    });

    it("returns correct directions with very narrow front arc", () => {
      unit.rotation = 0;
      const frontBackArc = Math.PI / 6; // 30 degrees
      // Only points very close to the front are considered Front
      expect(unit.getDirectionToPoint(new Vector2(10, 0), frontBackArc)).toBe(
        Direction.Front
      );
      // Point at 20 degrees (outside narrow front arc)
      const angle = frontBackArc / 2 + 0.1;
      expect(
        unit.getDirectionToPoint(
          new Vector2(Math.cos(angle) * 10, Math.sin(angle) * 10),
          frontBackArc
        )
      ).not.toBe(Direction.Front);
    });

    it("returns Left for point that should be Left with large negative angle normalization", () => {
      // This test case reproduces a bug where angle normalization failed
      // when the angle was very negative, causing incorrect direction detection
      unit.position = new Vector2(760.21, 416.02);
      unit.rotation = 5.57;
      const frontBackArc = 1.5707963267948966; // π/2 (90 degrees)
      const point = new Vector2(748.5, 396.11);

      // The point is to the left of the unit, so it should return Left
      expect(unit.getDirectionToPoint(point, frontBackArc)).toBe(
        Direction.Left
      );
    });
  });

  describe("calculateCollisionShapes()", () => {
    // Build a per-game manager with a custom formation, then swap the unit's
    // formation onto it — lets us test zero-knob behavior without touching
    // built-in formation data.
    const makeUnitWithFormation = (
      collisionCircles: number,
      collisionCircleSize: number,
    ): TestUnit => {
      const customManager = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitFormations: [
          {
            id: "test-no-collision",
            baseSprite: "infantry/line",
            collisionCircles,
            collisionCircleSize,
          } as never,
        ],
      });
      const u = new TestUnit(20, customManager);
      u.currentFormation = "test-no-collision";
      return u;
    };

    it("returns [] when collisionCircles is 0 (flying/ghost unit)", () => {
      const flying = makeUnitWithFormation(0, 16);
      expect(flying.calculateCollisionShapes()).toEqual([]);
    });

    it("returns [] when collisionCircleSize is 0 (flying/ghost unit)", () => {
      const flying = makeUnitWithFormation(1, 0);
      expect(flying.calculateCollisionShapes()).toEqual([]);
    });

    it("returns non-empty circles when both knobs are positive", () => {
      const normal = makeUnitWithFormation(3, 8);
      expect(normal.calculateCollisionShapes().length).toBe(3);
    });
  });

  describe("getFlankMod()", () => {
    // A malformed custom formation (e.g. legacy flankMin/flankMax keys that
    // never got migrated to minFlankAngle/maxFlankAngle) leaves the canonical
    // angles undefined. getFlankMod must not leak a NaN into combat math.
    const makeUnitWithFlankAngles = (
      minFlankAngle: number | undefined,
      maxFlankAngle: number | undefined,
    ): TestUnit => {
      const customManager = GameDataManager.createWithCustomDefs("napoleonic", {
        customUnitFormations: [
          {
            id: "test-flank",
            baseSprite: "infantry/line",
            collisionCircles: 1,
            collisionCircleSize: 8,
            minFlankAngle,
            maxFlankAngle,
          } as never,
        ],
      });
      const u = new TestUnit(21, customManager);
      u.currentFormation = "test-flank";
      u.position = new Vector2(0, 0);
      u.rotation = 0;
      return u;
    };

    it("returns 0 (not NaN) when the flank angles are undefined", () => {
      const u = makeUnitWithFlankAngles(undefined, undefined);
      const mod = u.getFlankMod(new Vector2(10, 10));
      expect(Number.isNaN(mod)).toBe(false);
      expect(mod).toBe(0);
    });

    it("returns a real flanking percentage when the angles are valid", () => {
      const u = makeUnitWithFlankAngles(60, 120);
      // Attacker directly behind a unit facing +x is a full flank.
      const mod = u.getFlankMod(new Vector2(-10, 0));
      expect(Number.isNaN(mod)).toBe(false);
      expect(mod).toBe(1);
    });
  });
});
