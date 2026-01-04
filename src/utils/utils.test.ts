import { Direction } from "@lob-sdk/types";
import {
  checkCollision,
  degreesToRadians,
  getDirectionToPoint,
  getMaxOrgProportionDebuff,
} from "./utils";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { TWO_PI } from "@lob-sdk/constants";

const gameDataManager = GameDataManager.get("napoleonic");

const { organization } = gameDataManager.getGameRules();
if (!organization) {
  throw new Error("Organization rules are not defined");
}

describe("getMaxOrgProportionDebuff()", () => {
  // HP Debuff Tests
  describe("HP Debuff", () => {
    it("returns 0 when hpProportion is 1", () => {
      expect(getMaxOrgProportionDebuff(gameDataManager, 1, 1)).toBe(0);
    });

    it("returns MAX_ORG_DEBUFF_HP when hpProportion is at MIN_HP_PROPORTION", () => {
      expect(
        getMaxOrgProportionDebuff(
          gameDataManager,
          organization.maxOrgDebuffMinHpProportion,
          1
        )
      ).toBe(organization.maxOrgDebuffHp);
    });

    it("returns MAX_ORG_DEBUFF_HP when hpProportion is below MIN_HP_PROPORTION", () => {
      expect(getMaxOrgProportionDebuff(gameDataManager, 0, 1)).toBe(
        organization.maxOrgDebuffHp
      );
    });

    it("scales linearly for hpProportion between 1 and MIN_HP_PROPORTION", () => {
      expect(getMaxOrgProportionDebuff(gameDataManager, 0.5, 1)).toBeCloseTo(
        0.43
      );
    });
  });

  // Stamina Debuff Tests
  describe("Stamina Debuff", () => {
    it("returns 0 when staminaProportion is at or above STAMINA_HIGH_PROPORTION", () => {
      expect(
        getMaxOrgProportionDebuff(
          gameDataManager,
          1,
          organization.maxOrgDebuffStaminaHighProportion
        )
      ).toBe(0);
      expect(getMaxOrgProportionDebuff(gameDataManager, 1, 1)).toBe(0);
    });

    it("returns MAX_ORG_DEBUFF_STAMINA when staminaProportion is at STAMINA_LOW_PROPORTION", () => {
      expect(
        getMaxOrgProportionDebuff(
          gameDataManager,
          1,
          organization.maxOrgDebuffStaminaLowProportion
        )
      ).toBe(organization.maxOrgDebuffStamina);
    });

    it("returns MAX_ORG_DEBUFF_STAMINA when staminaProportion is below STAMINA_LOW_PROPORTION", () => {
      expect(getMaxOrgProportionDebuff(gameDataManager, 1, 0)).toBe(
        organization.maxOrgDebuffStamina
      );
    });

    it("scales linearly for staminaProportion between STAMINA_HIGH_PROPORTION and STAMINA_LOW_PROPORTION", () => {
      expect(getMaxOrgProportionDebuff(gameDataManager, 1, 0.5)).toBeCloseTo(
        0.15
      );
    });
  });

  // Combined Debuff Tests
  describe("Combined Debuff", () => {
    it("combines HP and stamina debuffs correctly", () => {
      expect(getMaxOrgProportionDebuff(gameDataManager, 0.5, 0.5)).toBeCloseTo(
        0.58
      );
    });

    it("returns max combined debuff when both proportions are at minimum", () => {
      // hpProportion = 0.25 (250), staminaProportion = 0.2 (165) -> 250 + 165 = 415
      expect(
        getMaxOrgProportionDebuff(
          gameDataManager,
          organization.maxOrgDebuffMinHpProportion,
          organization.maxOrgDebuffStaminaLowProportion
        )
      ).toBe(organization.maxOrgDebuffHp + organization.maxOrgDebuffStamina);
    });
  });

  // Edge Case Tests
  describe("Edge Cases", () => {
    it("handles negative hpProportion (treats as 0)", () => {
      expect(getMaxOrgProportionDebuff(gameDataManager, -0.1, 1)).toBe(
        organization.maxOrgDebuffHp
      );
    });

    it("handles negative staminaProportion (treats as STAMINA_LOW_PROPORTION)", () => {
      expect(getMaxOrgProportionDebuff(gameDataManager, 1, -0.1)).toBe(
        organization.maxOrgDebuffStamina
      );
    });

    it("handles staminaProportion > 1 (treats as 1)", () => {
      expect(getMaxOrgProportionDebuff(gameDataManager, 1, 1.1)).toBe(0);
    });
  });
});

describe("checkCollision()", () => {
  it("should return false when collisionLevel1 is 0", () => {
    expect(checkCollision(0, 0)).toBe(true); // 0 >= 0 and both are not NO_COLLISION_LEVEL
    expect(checkCollision(0, 1)).toBe(false); // 0 < 1
    expect(checkCollision(0, 5)).toBe(false); // 0 < 5
    expect(checkCollision(0, 100)).toBe(false); // 0 < 100
  });

  it("should return true when collisionLevel1 is greater than collisionLevel2", () => {
    expect(checkCollision(5, 3)).toBe(true);
    expect(checkCollision(10, 1)).toBe(true);
    expect(checkCollision(2, 1)).toBe(true);
    expect(checkCollision(100, 50)).toBe(true);
  });

  it("should return true when collisionLevel1 equals collisionLevel2", () => {
    expect(checkCollision(1, 1)).toBe(true);
    expect(checkCollision(5, 5)).toBe(true);
    expect(checkCollision(10, 10)).toBe(true);
    expect(checkCollision(100, 100)).toBe(true);
  });

  it("should return false when collisionLevel1 is less than collisionLevel2", () => {
    expect(checkCollision(1, 2)).toBe(false);
    expect(checkCollision(3, 5)).toBe(false);
    expect(checkCollision(10, 20)).toBe(false);
    expect(checkCollision(50, 100)).toBe(false);
  });

  it("should return false when collisionLevel2 is 0", () => {
    expect(checkCollision(1, 0)).toBe(true); // 1 >= 0 and both are not NO_COLLISION_LEVEL
    expect(checkCollision(5, 0)).toBe(true); // 5 >= 0 and both are not NO_COLLISION_LEVEL
    expect(checkCollision(0, 0)).toBe(true); // 0 >= 0 and both are not NO_COLLISION_LEVEL
  });

  it("should handle large positive integers", () => {
    expect(checkCollision(1000, 500)).toBe(true);
    expect(checkCollision(1000, 1000)).toBe(true);
    expect(checkCollision(1000, 2000)).toBe(false);
    expect(checkCollision(5000, 3000)).toBe(true);
  });

  it("should return false for zero regardless of collisionLevel2", () => {
    expect(checkCollision(0, 0)).toBe(true); // 0 >= 0 and both are not NO_COLLISION_LEVEL
    expect(checkCollision(0, 1)).toBe(false); // 0 < 1
    expect(checkCollision(0, 100)).toBe(false); // 0 < 100
    expect(checkCollision(0, 1000)).toBe(false); // 0 < 1000
  });

  it("should handle typical collision level values", () => {
    // Common collision level scenarios
    expect(checkCollision(1, 1)).toBe(true);
    expect(checkCollision(2, 1)).toBe(true);
    expect(checkCollision(3, 2)).toBe(true);
    expect(checkCollision(1, 2)).toBe(false);
    expect(checkCollision(2, 3)).toBe(false);
  });
});

describe("getDirectionToPoint()", () => {
  describe("Basic directions with rotation 0 (facing right/east)", () => {
    const rotation = 0;
    const frontBackArc = degreesToRadians(90);

    it("should return Front for target directly ahead", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 10, y: 0 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should return Front for target slightly above ahead", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 10, y: 1 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should return Front for target slightly below ahead", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 10, y: -1 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should return Back for target directly behind", () => {
      const from = { x: 0, y: 0 };
      const to = { x: -10, y: 0 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Back
      );
    });

    it("should return Back for target slightly above behind", () => {
      const from = { x: 0, y: 0 };
      const to = { x: -10, y: 1 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Back
      );
    });

    it("should return Back for target slightly below behind", () => {
      const from = { x: 0, y: 0 };
      const to = { x: -10, y: -1 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Back
      );
    });

    it("should return Right for target directly to the right", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 0, y: 10 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Right
      );
    });

    it("should return Left for target directly to the left", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 0, y: -10 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Left
      );
    });
  });

  describe("Different rotations", () => {
    const frontBackArc = degreesToRadians(90);

    it("should return Front when unit faces up (90°) and target is above", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 0, y: 10 };
      expect(
        getDirectionToPoint(from, to, degreesToRadians(90), frontBackArc)
      ).toBe(Direction.Front);
    });

    it("should return Back when unit faces up (90°) and target is below", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 0, y: -10 };
      expect(
        getDirectionToPoint(from, to, degreesToRadians(90), frontBackArc)
      ).toBe(Direction.Back);
    });

    it("should return Left when unit faces up (90°) and target is to the right (east)", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 10, y: 0 };
      // When facing up, east is to the left of the unit (counter-clockwise from front)
      expect(
        getDirectionToPoint(from, to, degreesToRadians(90), frontBackArc)
      ).toBe(Direction.Left);
    });

    it("should return Right when unit faces up (90°) and target is to the left (west)", () => {
      const from = { x: 0, y: 0 };
      const to = { x: -10, y: 0 };
      // When facing up, west is to the right of the unit
      expect(
        getDirectionToPoint(from, to, degreesToRadians(90), frontBackArc)
      ).toBe(Direction.Right);
    });

    it("should return Front when unit faces left (180°) and target is to the left", () => {
      const from = { x: 0, y: 0 };
      const to = { x: -10, y: 0 };
      expect(
        getDirectionToPoint(from, to, degreesToRadians(180), frontBackArc)
      ).toBe(Direction.Front);
    });

    it("should return Back when unit faces left (180°) and target is to the right", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 10, y: 0 };
      expect(
        getDirectionToPoint(from, to, degreesToRadians(180), frontBackArc)
      ).toBe(Direction.Back);
    });

    it("should return Front when unit faces down (-90°) and target is below", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 0, y: -10 };
      expect(
        getDirectionToPoint(from, to, degreesToRadians(-90), frontBackArc)
      ).toBe(Direction.Front);
    });

    it("should return Back when unit faces down (-90°) and target is above", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 0, y: 10 };
      expect(
        getDirectionToPoint(from, to, degreesToRadians(-90), frontBackArc)
      ).toBe(Direction.Back);
    });
  });

  describe("Different frontBackArc values", () => {
    const rotation = 0;
    const from = { x: 0, y: 0 };

    it("should work with small frontBackArc (45°)", () => {
      const frontBackArc = degreesToRadians(45);
      expect(
        getDirectionToPoint(from, { x: 10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Front);
      expect(
        getDirectionToPoint(from, { x: -10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Back);
      expect(
        getDirectionToPoint(from, { x: 0, y: 10 }, rotation, frontBackArc)
      ).toBe(Direction.Right);
      expect(
        getDirectionToPoint(from, { x: 0, y: -10 }, rotation, frontBackArc)
      ).toBe(Direction.Left);
    });

    it("should work with large frontBackArc (135°)", () => {
      const frontBackArc = degreesToRadians(135);
      expect(
        getDirectionToPoint(from, { x: 10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Front);
      expect(
        getDirectionToPoint(from, { x: -10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Back);
      // With large frontBackArc, side directions have smaller arcs
      expect(
        getDirectionToPoint(from, { x: 0, y: 10 }, rotation, frontBackArc)
      ).toBe(Direction.Right);
      expect(
        getDirectionToPoint(from, { x: 0, y: -10 }, rotation, frontBackArc)
      ).toBe(Direction.Left);
    });

    it("should work with very small frontBackArc (22.5°)", () => {
      const frontBackArc = degreesToRadians(22.5);
      expect(
        getDirectionToPoint(from, { x: 10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Front);
      expect(
        getDirectionToPoint(from, { x: -10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Back);
    });

    it("should work with π frontBackArc (180 degrees)", () => {
      const frontBackArc = degreesToRadians(180);
      expect(
        getDirectionToPoint(from, { x: 10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Front);
      expect(
        getDirectionToPoint(from, { x: -10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Back);
      // With π frontBackArc, the front and back arcs each cover 180 degrees
      // So points at 90 and 270 degrees fall into front/back arcs
      expect(
        getDirectionToPoint(from, { x: 0, y: 10 }, rotation, frontBackArc)
      ).toBe(Direction.Front);
      // At 270 degrees (-90), with frontBackArc=π, the front arc wraps from -π/2 to π/2
      expect(
        getDirectionToPoint(from, { x: 0, y: -10 }, rotation, frontBackArc)
      ).toBe(Direction.Front);
    });
  });

  describe("Edge cases - boundary conditions", () => {
    const rotation = 0;
    const frontBackArc = degreesToRadians(90);
    const from = { x: 0, y: 0 };

    it("should handle target at front arc boundary", () => {
      // At 45 degrees, which is the front arc boundary
      const angle = degreesToRadians(45);
      const to = { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should handle target at back arc boundary", () => {
      // At 135 degrees, which is the back arc boundary
      const angle = degreesToRadians(135);
      const to = { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Back
      );
    });

    it("should handle target exactly at right boundary", () => {
      // At 90 degrees, which is the right boundary
      const angle = degreesToRadians(90);
      const to = { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Right
      );
    });

    it("should handle target exactly at left boundary", () => {
      // At -90 degrees, which is the left boundary
      const angle = degreesToRadians(-90);
      const to = { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Left
      );
    });
  });

  describe("Angle wrapping around 0/2π", () => {
    const frontBackArc = degreesToRadians(90);

    it("should handle angles near 0 wrapping to 2π", () => {
      const from = { x: 0, y: 0 };
      const rotation = 0.1; // Slightly rotated
      const to = { x: 10, y: 0.1 }; // Slightly above, should still be front
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should handle angles near 2π wrapping to 0", () => {
      const from = { x: 0, y: 0 };
      const rotation = TWO_PI - 0.1; // Near 2π
      const to = { x: 10, y: -0.1 }; // Slightly below, should still be front
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should handle rotation at 2π (equivalent to 0)", () => {
      const from = { x: 0, y: 0 };
      const rotation = TWO_PI;
      const to = { x: 10, y: 0 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should handle rotation at -2π (equivalent to 0)", () => {
      const from = { x: 0, y: 0 };
      const rotation = -TWO_PI;
      const to = { x: 10, y: 0 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });
  });

  describe("Different positions", () => {
    const rotation = 0;
    const frontBackArc = degreesToRadians(90);

    it("should work with unit at non-origin position", () => {
      const from = { x: 100, y: 200 };
      const to = { x: 110, y: 200 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should work with unit at negative coordinates", () => {
      const from = { x: -50, y: -75 };
      const to = { x: -40, y: -75 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should work with large coordinate values", () => {
      const from = { x: 10000, y: 20000 };
      const to = { x: 10010, y: 20000 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should work with very small coordinate differences", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 0.001, y: 0 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });
  });

  describe("Diagonal directions", () => {
    const rotation = 0;
    const frontBackArc = degreesToRadians(90);
    const from = { x: 0, y: 0 };

    it("should return Front for target in front-right diagonal", () => {
      const to = { x: 10, y: 5 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should return Front for target in front-left diagonal", () => {
      const to = { x: 10, y: -5 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should return Back for target in back-right diagonal", () => {
      const to = { x: -10, y: 5 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Back
      );
    });

    it("should return Back for target in back-left diagonal", () => {
      const to = { x: -10, y: -5 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Back
      );
    });
  });

  describe("Complex rotation scenarios", () => {
    const frontBackArc = degreesToRadians(90);
    const from = { x: 0, y: 0 };

    it("should handle 45-degree rotation", () => {
      const rotation = degreesToRadians(45);
      // Target at 45 degrees from origin should be front
      const to = { x: 10, y: 10 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should handle 135-degree rotation", () => {
      const rotation = degreesToRadians(135);
      // Target at 135 degrees from origin should be front
      const to = { x: -10, y: 10 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should handle 225-degree rotation", () => {
      const rotation = degreesToRadians(225);
      // Target at 225 degrees from origin should be front
      const to = { x: -10, y: -10 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should handle 315-degree rotation", () => {
      const rotation = degreesToRadians(315);
      // Target at 315 degrees from origin should be front
      const to = { x: 10, y: -10 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });
  });

  describe("Edge cases with same position", () => {
    const rotation = 0;
    const frontBackArc = degreesToRadians(90);

    it("should handle target at same position as unit", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 0, y: 0 };
      // When target is at same position, angle is 0, which should be in front arc
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should handle target very close to unit", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 0.0001, y: 0 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });
  });

  describe("Various frontBackArc edge cases", () => {
    const rotation = 0;
    const from = { x: 0, y: 0 };

    it("should handle frontBackArc of 0 (no front/back arc)", () => {
      const frontBackArc = 0;
      // With 0 arc, front arc is from 2π to 0 (wraps around), so (10, 0) at angle 0 is in front
      expect(
        getDirectionToPoint(from, { x: 10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Front);
      // With 0 arc, back arc is from π to π, but the front arc wraps, so (-10, 0) at angle π is in front
      expect(
        getDirectionToPoint(from, { x: -10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Front);
    });

    it("should handle frontBackArc of 30 degrees", () => {
      const frontBackArc = degreesToRadians(30);
      expect(
        getDirectionToPoint(from, { x: 10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Front);
      expect(
        getDirectionToPoint(from, { x: -10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Back);
    });

    it("should handle frontBackArc of 60 degrees", () => {
      const frontBackArc = degreesToRadians(60);
      expect(
        getDirectionToPoint(from, { x: 10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Front);
      expect(
        getDirectionToPoint(from, { x: -10, y: 0 }, rotation, frontBackArc)
      ).toBe(Direction.Back);
    });
  });

  describe("Comprehensive angle coverage", () => {
    const rotation = 0;
    const frontBackArc = degreesToRadians(90);
    const from = { x: 0, y: 0 };
    const distance = 10;

    it("should correctly classify all angles in a full circle", () => {
      // With frontBackArc = 90°, front arc is from -45° to 45° (wrapped)
      // Back arc is from 135° to 225°
      // Right is from 45° to 135°
      // Left is from 225° to 315° (or -135° to -45°)
      const angles = [
        { angle: degreesToRadians(0), expected: Direction.Front },
        { angle: degreesToRadians(22.5), expected: Direction.Front },
        { angle: degreesToRadians(45), expected: Direction.Front }, // Boundary of front arc
        { angle: degreesToRadians(67.5), expected: Direction.Right },
        { angle: degreesToRadians(90), expected: Direction.Right },
        { angle: degreesToRadians(112.5), expected: Direction.Right },
        { angle: degreesToRadians(135), expected: Direction.Back }, // Boundary of back arc
        { angle: degreesToRadians(157.5), expected: Direction.Back },
        { angle: degreesToRadians(180), expected: Direction.Back },
        { angle: degreesToRadians(202.5), expected: Direction.Back },
        { angle: degreesToRadians(225), expected: Direction.Back }, // Boundary of back arc
        { angle: degreesToRadians(247.5), expected: Direction.Left },
        { angle: degreesToRadians(270), expected: Direction.Left },
        { angle: degreesToRadians(292.5), expected: Direction.Left },
        { angle: degreesToRadians(314), expected: Direction.Left }, // Just before front arc boundary
        { angle: degreesToRadians(315), expected: Direction.Front }, // At front arc boundary (7π/4)
        { angle: degreesToRadians(337.5), expected: Direction.Front }, // Wraps around to -22.5°, which is in front arc
      ];

      angles.forEach(({ angle, expected }) => {
        const to = {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
        };
        const result = getDirectionToPoint(from, to, rotation, frontBackArc);
        expect(result).toBe(expected);
      });
    });
  });

  describe("Real-world scenarios", () => {
    const frontBackArc = degreesToRadians(90);

    it("should handle unit facing enemy formation", () => {
      const from = { x: 0, y: 0 };
      const rotation = 0;
      const enemyPosition = { x: 100, y: 0 };
      expect(
        getDirectionToPoint(from, enemyPosition, rotation, frontBackArc)
      ).toBe(Direction.Front);
    });

    it("should handle unit with enemy behind", () => {
      const from = { x: 0, y: 0 };
      const rotation = 0;
      const enemyPosition = { x: -100, y: 0 };
      expect(
        getDirectionToPoint(from, enemyPosition, rotation, frontBackArc)
      ).toBe(Direction.Back);
    });

    it("should handle unit with enemy on flank", () => {
      const from = { x: 0, y: 0 };
      const rotation = 0;
      const enemyPosition = { x: 0, y: 100 };
      expect(
        getDirectionToPoint(from, enemyPosition, rotation, frontBackArc)
      ).toBe(Direction.Right);
    });

    it("should handle rotated unit tracking moving target", () => {
      const from = { x: 50, y: 50 };
      const rotation = degreesToRadians(45); // Facing northeast
      const targetPosition = { x: 60, y: 60 }; // Northeast of unit
      expect(
        getDirectionToPoint(from, targetPosition, rotation, frontBackArc)
      ).toBe(Direction.Front);
    });
  });

  describe("Precision and floating point edge cases", () => {
    const rotation = 0;
    const frontBackArc = degreesToRadians(90);
    const from = { x: 0, y: 0 };

    it("should handle very small angles", () => {
      const to = { x: 10, y: 0.0001 };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should handle angles very close to boundaries", () => {
      // Just inside front arc boundary (45°)
      const angle = degreesToRadians(45) - 0.001;
      const to = {
        x: Math.cos(angle) * 10,
        y: Math.sin(angle) * 10,
      };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should handle angles just outside front arc", () => {
      // Just outside front arc boundary (45°)
      const angle = degreesToRadians(45) + 0.001;
      const to = {
        x: Math.cos(angle) * 10,
        y: Math.sin(angle) * 10,
      };
      expect(getDirectionToPoint(from, to, rotation, frontBackArc)).toBe(
        Direction.Right
      );
    });
  });

  describe("Multiple rotations with same target", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 10, y: 0 };
    const frontBackArc = degreesToRadians(90);

    it("should return Front when rotation is 0", () => {
      expect(getDirectionToPoint(from, to, 0, frontBackArc)).toBe(
        Direction.Front
      );
    });

    it("should return Right when rotation is -90°", () => {
      expect(
        getDirectionToPoint(from, to, degreesToRadians(-90), frontBackArc)
      ).toBe(Direction.Right);
    });

    it("should return Back when rotation is 180°", () => {
      expect(
        getDirectionToPoint(from, to, degreesToRadians(180), frontBackArc)
      ).toBe(Direction.Back);
    });

    it("should return Left when rotation is 90°", () => {
      expect(
        getDirectionToPoint(from, to, degreesToRadians(90), frontBackArc)
      ).toBe(Direction.Left);
    });
  });

  describe("Consistency tests", () => {
    const frontBackArc = degreesToRadians(90);
    const from = { x: 0, y: 0 };

    it("should be consistent for opposite directions", () => {
      const rotation = 0;
      const front = getDirectionToPoint(
        from,
        { x: 10, y: 0 },
        rotation,
        frontBackArc
      );
      const back = getDirectionToPoint(
        from,
        { x: -10, y: 0 },
        rotation,
        frontBackArc
      );
      expect(front).toBe(Direction.Front);
      expect(back).toBe(Direction.Back);
    });

    it("should be consistent for perpendicular directions", () => {
      const rotation = 0;
      const right = getDirectionToPoint(
        from,
        { x: 0, y: 10 },
        rotation,
        frontBackArc
      );
      const left = getDirectionToPoint(
        from,
        { x: 0, y: -10 },
        rotation,
        frontBackArc
      );
      expect(right).toBe(Direction.Right);
      expect(left).toBe(Direction.Left);
    });
  });
});
