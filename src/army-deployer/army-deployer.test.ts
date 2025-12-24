import {
  IGameDataManager,
  UnitCounts,
  Zone,
  UnitType,
  UnitCategoryId,
  DynamicBattleType,
} from "@lob-sdk/types";
import { ArmyDeployer } from "./army-deployer";

describe("ArmyDeployer", () => {
  const createMockGameDataManager = (): IGameDataManager => {
    const mockUnitTemplates = new Map<UnitType, any>();

    // Create mock unit templates for the test units (types 1, 3, 11)
    mockUnitTemplates.set(1, {
      type: 1,
      category: "infantry" as UnitCategoryId,
      canDeployForward: false,
      hasSkirmishers: false,
    });
    mockUnitTemplates.set(3, {
      type: 3,
      category: "infantry" as UnitCategoryId,
      canDeployForward: false,
      hasSkirmishers: false,
    });
    mockUnitTemplates.set(11, {
      type: 11,
      category: "infantry" as UnitCategoryId,
      canDeployForward: false,
      hasSkirmishers: false,
    });

    return {
      era: "napoleonic",
      getGameConstants: () =>
        ({
          FORWARD_DEPLOYMENT_ZONE_OFFSET: 0,
        } as any),
      getUnitTemplateManager: () => ({
        getTemplate: (type: UnitType) => {
          return (
            mockUnitTemplates.get(type) || {
              type,
              category: "infantry" as UnitCategoryId,
              canDeployForward: false,
              hasSkirmishers: false,
            }
          );
        },
        getTemplates: () => Array.from(mockUnitTemplates.values()),
        load: () => {},
        getFormation: () => null,
        getDefaultFormation: () => ({} as any),
        getAvailableFormations: () => [],
      }),
      getGameRules: () => ({
        objectives: {} as any,
        organization: {} as any,
      }),
      getUnitCategoryTemplate: (category: UnitCategoryId) => ({
        id: category,
        firingAltitude: 0,
        deploymentSection: "center" as const,
      }),
      getBattleType: (type: DynamicBattleType) => ({
        manpower: 0,
        gold: 0,
        ammoReserve: 0,
        goldToAmmoRate: 0,
        fogOfWar: false,
        unitCaps: {} as Record<UnitType, number>,
        eloKFactor: 0,
        ticksToCaptureSmall: 0,
        ticksToCaptureBig: 0,
        defaultArmy: {} as UnitCounts,
      }),
      getUnitDimensions: () => ({ width: 0, height: 0 }),
      getMovementModifier: () => 1,
      isPassable: () => true,
    };
  };

  const gameDataManager = createMockGameDataManager();

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
