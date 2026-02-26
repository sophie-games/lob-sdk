import { DeploymentZone, UnitCounts, Zone } from "@lob-sdk/types";
import { ArmyDeployer } from "./army-deployer";
import { GameDataManager } from "@lob-sdk/game-data-manager";

describe("ArmyDeployer", () => {
  const gameDataManager = GameDataManager.get("napoleonic");

  describe("calculateSectionMetrics()", () => {
    it("should have space for all the units", () => {
      const unitCounts: UnitCounts = {
        "1": 10,
        "3": 2,
        "11": 6,
      };

      const deploymentZone: DeploymentZone = {
        player: 1,
        x: 1508.5714285714284,
        y: 48,
        radius: 128,
        capacity: 0,
      };

      const armyDeployer = new ArmyDeployer(
        gameDataManager,
        unitCounts,
        deploymentZone,
        8,
        2
      );
      const metrics = armyDeployer.calculateSectionMetrics();

      expect(metrics.leftFlankMaxUnits).toBeGreaterThan(0);
      expect(metrics.centerMaxUnits).toBeGreaterThan(0);
      expect(metrics.rightFlankMaxUnits).toBeGreaterThan(0);
    });
  });
});
