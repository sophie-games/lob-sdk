import { UnitCounts, Zone } from "@lob-sdk/types";
import { ArmyDeployer } from "./army-deployer";
import { GameDataManager } from "@lob-sdk/game-data-manager";

describe("ArmyDeployer", () => {
  const gameDataManager = GameDataManager.get("napoleonic");

  it("rotates generated formation positions with the deployment zone", () => {
    const unitCounts: UnitCounts = { "1": 2 };
    const zone: Zone = { x: 100, y: 200, width: 400, height: 160 };
    const rotatedZone: Zone = { ...zone, rotation: Math.PI / 2 };

    const unrotated = new ArmyDeployer(
      gameDataManager,
      unitCounts,
      zone,
      zone,
      1,
      1,
    ).deploy();
    const rotated = new ArmyDeployer(
      gameDataManager,
      unitCounts,
      rotatedZone,
      rotatedZone,
      1,
      1,
    ).deploy();

    const center = { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
    expect(rotated).toHaveLength(unrotated.length);
    rotated.forEach((unit, index) => {
      const source = unrotated[index].pos;
      expect(unit.pos.x).toBeCloseTo(center.x - (source.y - center.y));
      expect(unit.pos.y).toBeCloseTo(center.y + (source.x - center.x));
    });
  });

  describe("calculateSectionMetrics()", () => {
    it("should have space for all the units", () => {
      const unitCounts: UnitCounts = {
        "1": 10,
        "3": 2,
        "11": 6,
      };

      const deploymentZone: Zone = {
        x: 1508.5714285714284,
        y: 48,
        width: 43.42857142857143,
        height: 304,
      };

      const forwardDeploymentZone: Zone = {
        x: 1508.5714285714284,
        y: 48,
        width: 43.42857142857143,
        height: 304,
      };

      const armyDeployer = new ArmyDeployer(
        gameDataManager,
        unitCounts,
        deploymentZone,
        forwardDeploymentZone,
        8,
        2,
      );
      const metrics = armyDeployer.calculateSectionMetrics(deploymentZone);

      expect(metrics.leftFlankMaxUnits).toBeGreaterThan(0);
      expect(metrics.centerMaxUnits).toBeGreaterThan(0);
      expect(metrics.rightFlankMaxUnits).toBeGreaterThan(0);
    });
  });
});
