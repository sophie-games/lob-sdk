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

  describe("order of battle layout", () => {
    // 1 = line infantry, 8 = cuirassiers, 12 = 12pdr foot artillery. None of the
    // three deploys forward, so they all land in the main zone.
    const wideZone: Zone = { x: 0, y: 0, width: 1200, height: 300 };
    // Skirmishers are spawned automatically and deploy forward; a zone of its own
    // keeps them out of the rows under test.
    const forwardZone: Zone = { ...wideZone, y: 2000 };
    const deploy = (unitCounts: UnitCounts) =>
      new ArmyDeployer(
        gameDataManager,
        unitCounts,
        wideZone,
        forwardZone,
        1,
        1,
      ).deploy().filter((unit) => unit.pos.y < 1000);

    /** Distinct x clusters in a row, split wherever the gap more than doubles. */
    const clusters = (xs: number[]) => {
      const sorted = [...xs].sort((a, b) => a - b);
      const gaps = sorted.slice(1).map((x, i) => x - sorted[i]);
      const tight = Math.min(...gaps);
      return gaps.filter((gap) => gap > tight * 2).length + 1;
    };

    it("stands each division apart as its own block of brigades", () => {
      // Twenty battalions are two divisions of two brigades of five.
      const rows = new Map<number, number[]>();
      for (const unit of deploy({ "1": 20 })) {
        const row = rows.get(unit.pos.y) ?? [];
        row.push(unit.pos.x);
        rows.set(unit.pos.y, row);
      }

      expect(rows.size).toBe(2);
      for (const row of rows.values()) {
        expect(row).toHaveLength(10);
        expect(clusters(row)).toBe(2);
      }
    });

    it("puts the cavalry on the wings, outside the infantry", () => {
      const deployed = deploy({ "1": 20, "8": 12 });
      const horse = deployed
        .filter((unit) => unit.type === 8)
        .map((unit) => unit.pos.x);
      const foot = deployed
        .filter((unit) => unit.type === 1)
        .map((unit) => unit.pos.x);

      expect(Math.min(...horse)).toBeLessThan(Math.min(...foot));
      expect(Math.max(...horse)).toBeGreaterThan(Math.max(...foot));
    });

    it("stands a division's battery in front of that division", () => {
      const deployed = deploy({ "1": 20, "12": 2 });
      const guns = deployed.filter((unit) => unit.type === 12);
      const front = Math.min(
        ...deployed.filter((unit) => unit.type === 1).map((unit) => unit.pos.y),
      );

      // One battery each, ahead of the first brigade line and a division apart
      // rather than both massed on the leading division.
      expect(guns).toHaveLength(2);
      for (const gun of guns) expect(gun.pos.y).toBeLessThan(front);

      const line = deployed
        .filter((unit) => unit.type === 1 && unit.pos.y === front)
        .map((unit) => unit.pos.x)
        .sort((a, b) => a - b);
      const pitch = Math.min(...line.slice(1).map((x, i) => x - line[i]));
      expect(Math.abs(guns[0].pos.x - guns[1].pos.x)).toBeGreaterThan(3 * pitch);
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
