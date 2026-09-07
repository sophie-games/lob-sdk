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

    /** Groups of x that stand together, split wherever the gap more than doubles. */
    const clusters = (xs: number[]) => {
      const sorted = [...xs].sort((a, b) => a - b);
      const gaps = sorted.slice(1).map((x, i) => x - sorted[i]);
      const tight = Math.min(...gaps);
      const groups: number[][] = [[sorted[0]]];
      gaps.forEach((gap, i) => {
        if (gap > tight * 2) groups.push([]);
        groups[groups.length - 1].push(sorted[i + 1]);
      });
      return groups;
    };

    it("stands each division apart as its own block of brigades", () => {
      const rows = new Map<number, number[]>();
      for (const unit of deploy({ "1": 20 })) {
        const row = rows.get(unit.pos.y) ?? [];
        row.push(unit.pos.x);
        rows.set(unit.pos.y, row);
      }

      // Two brigade rows, each cut into one block per division, no block over the
      // brigade ceiling.
      expect(rows.size).toBe(2);
      const blocks = [...rows.values()].map(clusters);
      expect(blocks[0]).toHaveLength(blocks[1].length);
      expect(blocks[0].length).toBeGreaterThan(1);
      for (const row of blocks) {
        for (const block of row) expect(block.length).toBeLessThanOrEqual(5);
      }
    });

    it("keeps a division together instead of spreading it over the army", () => {
      // Skirmishers deploy forward, so they land in the other zone; each division's
      // screen must still stand over that division's own stretch of the front.
      const deployed = new ArmyDeployer(
        gameDataManager,
        { "1": 24, "16": 6 },
        wideZone,
        forwardZone,
        1,
        1,
      ).deploy();

      const screens = deployed
        .filter((unit) => unit.pos.y > 1000)
        .map((unit) => unit.pos.x)
        .sort((a, b) => a - b);
      const line = deployed
        .filter((unit) => unit.pos.y < 1000)
        .map((unit) => unit.pos.x);

      // The screen spans the infantry, rather than being spread over the whole zone.
      expect(Math.min(...screens)).toBeGreaterThanOrEqual(Math.min(...line));
      expect(Math.max(...screens)).toBeLessThanOrEqual(Math.max(...line));
      // One group of skirmishers per division, standing over its own division.
      expect(clusters(screens).length).toBe(
        clusters(line.filter((x, i, all) => all.indexOf(x) === i)).length,
      );
    });

    it("centres the battery on its division rather than beside the screen", () => {
      // 24 line infantry, 6 skirmishers (which deploy forward) and 4 foot guns.
      const deployed = new ArmyDeployer(
        gameDataManager,
        { "1": 24, "16": 6, "12": 4 },
        wideZone,
        forwardZone,
        1,
        1,
      ).deploy();

      const midpoint = (types: number[]) => {
        const xs = deployed
          .filter((unit) => types.includes(unit.type))
          .map((unit) => unit.pos.x);
        return (Math.min(...xs) + Math.max(...xs)) / 2;
      };

      // Guns, screen and line all share the same centre: each has its own row.
      expect(midpoint([12])).toBeCloseTo(midpoint([1]), 0);
      expect(midpoint([16])).toBeCloseTo(midpoint([1]), 0);
    });

    it("keeps the light cavalry on the wings, ahead of the line", () => {
      // 11 = hussars, which deploy forward; the forward zone is the one at y 2000.
      const deployed = new ArmyDeployer(
        gameDataManager,
        { "1": 24, "11": 12 },
        wideZone,
        forwardZone,
        1,
        1,
      ).deploy();

      const xOf = (type: number) =>
        deployed.filter((unit) => unit.type === type).map((unit) => unit.pos.x);
      const horse = xOf(11);
      const foot = xOf(1);

      expect(Math.min(...horse)).toBeLessThan(Math.min(...foot));
      expect(Math.max(...horse)).toBeGreaterThan(Math.max(...foot));
    });

    it("puts the dragoons on the wings but behind the infantry line", () => {
      // 2 = dragoons, which stand in the main zone with the infantry.
      const deployed = deploy({ "1": 24, "2": 12 });
      const horse = deployed.filter((unit) => unit.type === 2);
      const foot = deployed.filter((unit) => unit.type === 1);
      const lastLine = Math.max(...foot.map((unit) => unit.pos.y));

      expect(Math.min(...horse.map((unit) => unit.pos.x))).toBeLessThan(
        Math.min(...foot.map((unit) => unit.pos.x)),
      );
      expect(Math.max(...horse.map((unit) => unit.pos.x))).toBeGreaterThan(
        Math.max(...foot.map((unit) => unit.pos.x)),
      );
      for (const unit of horse) expect(unit.pos.y).toBeGreaterThan(lastLine);
    });

    it("masses the cuirassiers behind the centre, between the dragoon wings", () => {
      // 8 = cuirassiers. Splitting them between the wings is Wagram, which left
      // nothing in hand to exploit the breakthrough.
      const deployed = deploy({ "1": 24, "2": 12, "8": 10 });
      const xOf = (type: number) =>
        deployed.filter((unit) => unit.type === type).map((unit) => unit.pos.x);
      const heavy = xOf(8);
      const dragoons = xOf(2);
      const lastLine = Math.max(
        ...deployed.filter((unit) => unit.type === 1).map((unit) => unit.pos.y),
      );

      for (const unit of deployed.filter((unit) => unit.type === 8)) {
        expect(unit.pos.y).toBeGreaterThan(lastLine);
      }
      // One body in the centre, with a dragoon wing on either side of it.
      expect(Math.min(...heavy)).toBeGreaterThan(Math.min(...dragoons));
      expect(Math.max(...heavy)).toBeLessThan(Math.max(...dragoons));
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
