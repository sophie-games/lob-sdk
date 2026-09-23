import { UnitCounts, TeamDeploymentZone } from "@lob-sdk/types";
import type { Point2 } from "@lob-sdk/vector";
import {
  mapDeploymentZonePoints,
  polygonFromBounds,
} from "../utils/deployment-zone";
import { ArmyDeployer } from "./army-deployer";
import { generateDefaultArmy } from "./utils";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import {
  countArmyOrganizationUnits,
  materializeArmyOrganization,
} from "@lob-sdk/order-of-battle";

describe("ArmyDeployer", () => {
  const gameDataManager = GameDataManager.get("napoleonic");
  const zone = (
    x: number,
    y: number,
    width: number,
    height: number,
  ): TeamDeploymentZone => ({
    team: 1,
    type: "main",
    polygons: [polygonFromBounds(x, y, x + width, y + height)],
  });

  describe("skirmisher allocation", () => {
    it("builds the complete deployed roster without mutating the saved army", () => {
      const units: UnitCounts = { 1: 4 };

      expect(
        ArmyDeployer.getDeployedUnitCounts(gameDataManager, units, "micro"),
      ).toEqual({ 1: 4, 16: 2 });
      expect(units).toEqual({ 1: 4 });
    });

    it("sums count times ratio and ignores units without a contribution", () => {
      const result = ArmyDeployer.getSkirmisherAllocation(
        gameDataManager,
        { 1: 2, 7: 3, 2: 4, 16: 9 },
        "micro",
      );
      expect(result?.weightedTotal).toBeCloseTo(5.6);
      expect(result).toMatchObject({
        amount: 2,
        coreUnitsPerSkirmisher: 2,
        nextBreakpoint: 6,
      });
      expect(
        ArmyDeployer.getSkirmishersAmount(
          gameDataManager,
          { 1: 2, 7: 3, 2: 4, 16: 9 },
          "micro",
        ),
      ).toBe(result?.amount);
    });

    it.each([
      [0, 0, 2],
      [1, 0, 2],
      [2, 1, 4],
      [4, 2, 6],
    ])(
      "reports the next threshold for %i line infantry",
      (count, amount, nextBreakpoint) => {
        expect(
          ArmyDeployer.getSkirmisherAllocation(
            gameDataManager,
            { 1: count },
            "micro",
          ),
        ).toEqual({
          amount,
          weightedTotal: count,
          coreUnitsPerSkirmisher: 2,
          nextBreakpoint,
        });
      },
    );

    it("uses battle-type ratios and the same integer rounding as deployment", () => {
      const custom = GameDataManager.createWithCustomDefs("napoleonic", {
        customGameRules: { organization: { maxOrgMeleeDefensePenalty: 0 } },
      });
      jest.spyOn(custom, "getBattleType").mockReturnValue({
        ...gameDataManager.getBattleType("micro"),
        skirmisherRatio: [2, 2.5],
      });
      expect(
        ArmyDeployer.getSkirmisherAllocation(custom, { 1: 2, 7: 0.5 }, "micro"),
      ).toEqual({
        amount: 0,
        weightedTotal: 2.6,
        coreUnitsPerSkirmisher: 1.25,
        nextBreakpoint: 3,
      });
      expect(
        ArmyDeployer.getSkirmisherAllocation(custom, { 1: 3 }, "micro"),
      ).toEqual({
        amount: 2,
        weightedTotal: 3,
        coreUnitsPerSkirmisher: 1.25,
        nextBreakpoint: 5,
      });
    });

    it("does not show a threshold when automatic skirmishers are disabled by the ratio", () => {
      const custom = GameDataManager.createWithCustomDefs("napoleonic", {
        customGameRules: { organization: { maxOrgMeleeDefensePenalty: 0 } },
      });
      jest.spyOn(custom, "getBattleType").mockReturnValue({
        ...gameDataManager.getBattleType("micro"),
        skirmisherRatio: [0, 2],
      });
      expect(
        ArmyDeployer.getSkirmisherAllocation(custom, { 1: 10 }, "micro"),
      ).toBeNull();
      expect(
        ArmyDeployer.getSkirmishersAmount(custom, { 1: 10 }, "micro"),
      ).toBe(0);
    });
  });

  it("lays an army facing east along the frontage of ground turned to match", () => {
    const unitCounts = generateDefaultArmy(gameDataManager, "battle").units;
    const facingNorth = zone(100, 200, 1200, 300);
    // A quarter turn clockwise about the zone's centre, which faces north to east.
    const quarterTurn = ({ x, y }: Point2) => ({
      x: 700 - (y - 350),
      y: 350 + (x - 700),
    });
    const facingEast: TeamDeploymentZone = {
      ...mapDeploymentZonePoints(facingNorth, quarterTurn),
      rotation: 0,
    };

    const north = new ArmyDeployer(
      gameDataManager,
      unitCounts,
      facingNorth,
      facingNorth,
      1,
      1,
    ).deploy();
    const east = new ArmyDeployer(
      gameDataManager,
      unitCounts,
      facingEast,
      facingEast,
      1,
      1,
    ).deploy();

    expect(east).toHaveLength(north.length);
    east.forEach((unit, index) => {
      const expected = quarterTurn(north[index].pos);
      expect(unit.pos.x).toBeCloseTo(expected.x);
      expect(unit.pos.y).toBeCloseTo(expected.y);
      expect(unit.rotation).toBe(0);
    });
  });

  describe("order of battle layout", () => {
    // 1 = line infantry, 8 = cuirassiers, 12 = 12pdr foot artillery. None of the
    // three deploys forward, so they all land in the main zone.
    const wideZone = zone(0, 0, 1200, 300);
    // Skirmishers are spawned automatically and deploy forward; a zone of its own
    // keeps them out of the rows under test.
    const forwardZone = zone(0, 2000, 1200, 300);
    const deploy = (unitCounts: UnitCounts) =>
      new ArmyDeployer(gameDataManager, unitCounts, wideZone, forwardZone, 1, 1)
        .deploy()
        .filter((unit) => unit.pos.y < 1000);

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

    it("describes the default deployment as an editable organization", () => {
      const units: UnitCounts = { 1: 20, 8: 4, 12: 2 };
      const organization = ArmyDeployer.getDefaultOrganization(
        gameDataManager,
        units,
        "battle",
      );

      expect(organization.version).toBe(1);
      expect(organization.divisions.length).toBeGreaterThan(1);
      expect(countArmyOrganizationUnits(organization)).toEqual(
        ArmyDeployer.getDeployedUnitCounts(gameDataManager, units, "battle"),
      );
    });

    it("gives each division of the default organization the battery that deployed with it", () => {
      // 2 = dragoons (rear wing), 8 = cuirassiers (rear centre), 6 = horse guns,
      // which both cavalry divisions draw on.
      const units: UnitCounts = { 1: 10, 2: 5, 8: 5, 6: 4 };
      const deployed = new ArmyDeployer(
        gameDataManager,
        units,
        wideZone,
        forwardZone,
        1,
        1,
        "battle",
      )
        .deploy()
        .map((unit, id) => ({ ...unit, id }));
      const organization = materializeArmyOrganization(
        ArmyDeployer.getDefaultOrganization(gameDataManager, units, "battle"),
        1,
        deployed,
      );

      expect(organization).not.toBeNull();

      const xsOf = (brigades: { unitIds: number[] }[]) =>
        brigades.flatMap(({ unitIds }) =>
          unitIds.map((id) => deployed[id].pos.x),
        );
      for (const { brigades } of organization?.divisions ?? []) {
        const isGuns = ({ kind }: { kind?: string }) => kind === "artillery";
        const line = xsOf(brigades.filter((brigade) => !isGuns(brigade)));
        if (line.length === 0) continue;
        for (const x of xsOf(brigades.filter(isGuns))) {
          expect(x).toBeGreaterThanOrEqual(Math.min(...line));
          expect(x).toBeLessThanOrEqual(Math.max(...line));
        }
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
      expect(Math.abs(guns[0].pos.x - guns[1].pos.x)).toBeGreaterThan(
        3 * pitch,
      );
    });
  });

  describe("calculateSectionMetrics()", () => {
    it("should have space for all the units", () => {
      const unitCounts: UnitCounts = {
        "1": 10,
        "3": 2,
        "11": 6,
      };

      const deploymentZone = zone(
        1508.5714285714284,
        48,
        43.42857142857143,
        304,
      );

      const forwardDeploymentZone = zone(
        1508.5714285714284,
        48,
        43.42857142857143,
        304,
      );

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

it("uses scenario doctrine sizes and brigade counts for deployment", () => {
  const base = GameDataManager.get("ww2").getOrganizationDoctrine();
  const game = GameDataManager.createWithCustomDefs("ww2", {
    organizationDoctrine: {
      ...base,
      divisions: base.divisions.map((d) =>
        d.id === "infantry"
          ? { ...d, maxTroops: 12, maxPerBrigade: 4, maxBrigades: 3 }
          : d,
      ),
    },
  });
  const zone: TeamDeploymentZone = {
    team: 1,
    type: "main",
    polygons: [polygonFromBounds(0, 0, 1200, 300)],
  };
  const forward: TeamDeploymentZone = {
    team: 1,
    type: "forward",
    polygons: [polygonFromBounds(0, 2000, 1200, 2300)],
  };
  const deployed = new ArmyDeployer(
    game,
    { "1": 12 },
    zone,
    forward,
    1,
    1,
  ).deploy();
  const line = deployed.filter((unit) => unit.type === 1);
  expect(line).toHaveLength(12);
  expect(new Set(line.map((unit) => unit.pos.y)).size).toBe(3);
});
