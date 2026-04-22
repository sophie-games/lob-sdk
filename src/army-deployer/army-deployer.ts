import {
  UnitCategoryId,
  UnitDtoPartialId,
  UnitType,
  UnitCounts,
  DynamicBattleType,
  Zone,
} from "@lob-sdk/types";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { DeploymentSection } from "@lob-sdk/game-data-manager";
import { divideArrayInHalf, getClosestPointInsideZone } from "@lob-sdk/utils";

/**
 * Metrics for calculating unit deployment positions within the deployment zone.
 * The deployment zone is divided into three horizontal sections: left flank (25%),
 * center (50%), and right flank (25%).
 */
interface SectionMetrics {
  /** Horizontal width (in pixels/units) of the left flank section. Represents 25% of the deployment zone width. */
  leftFlankWidth: number;
  /** Horizontal width (in pixels/units) of the center section. Represents 50% of the deployment zone width. */
  centerWidth: number;
  /** Horizontal width (in pixels/units) of the right flank section. Represents 25% of the deployment zone width. */
  rightFlankWidth: number;
  /** Starting X coordinate of the left flank section. */
  leftFlankStartX: number;
  /** Starting X coordinate of the center section. */
  centerStartX: number;
  /** Starting X coordinate of the right flank section. */
  rightFlankStartX: number;
  /** Maximum number of units that can fit in a single row within the left flank section. */
  leftFlankMaxUnits: number;
  /** Maximum number of units that can fit in a single row within the center section. */
  centerMaxUnits: number;
  /** Maximum number of units that can fit in a single row within the right flank section. */
  rightFlankMaxUnits: number;
  /** Spacing (in pixels/units) between units in the left flank section. */
  leftFlankSpacing: number;
  /** Spacing (in pixels/units) between units in the center section. */
  centerSpacing: number;
  /** Spacing (in pixels/units) between units in the right flank section. */
  rightFlankSpacing: number;
  /** Y coordinate for deploying units in the center section. */
  centerY: number;
  /** Y coordinate for deploying front units. */
  frontY: number;
  /** Y coordinate for deploying flank units. */
  flankY: number;
}

/**
 * Handles the deployment of units within a deployment zone, organizing them into sections
 * (flank, center, forward, front) based on their unit categories.
 */
export class ArmyDeployer {
  private readonly DEFAULT_UNIT_HEIGHT = 24;
  private readonly MIN_SPACING = 8;
  private readonly MARGIN = 12;

  private readonly units: UnitCounts;
  private readonly team: number;
  private readonly dynamicBattleType: DynamicBattleType;
  private readonly unitDtos: UnitDtoPartialId[] = [];

  private readonly rotation: number;

  /**
   * Creates a new ArmyDeployer instance.
   * @param gameDataManager - The game data manager instance.
   * @param units - A record mapping unit types to their counts.
   * @param mainDeploymentZone - The zone where normal units should be deployed.
   * @param mainDeploymentZone - The zone where forward units should be deployed.
   * @param player - The player number.
   * @param team - The team number (1 or 2).
   * @param dynamicBattleType - The battle type (defaults to Combat).
   */
  constructor(
    private gameDataManager: GameDataManager,
    units: UnitCounts,
    private readonly mainDeploymentZone: Zone,
    private readonly forwardDeploymentZone: Zone,
    private readonly player: number,
    team: number,
    dynamicBattleType?: DynamicBattleType,
  ) {
    this.units = { ...units };
    this.player = player;
    this.team = team;
    this.dynamicBattleType =
      dynamicBattleType ??
      gameDataManager.getGameConstants().DEFAULT_BATTLE_TYPE;
    this.rotation =
      this.team === 1 ? 270 * (Math.PI / 180) : 90 * (Math.PI / 180);
  }

  /**
   * Deploys all units in the deployment zone according to their categories and deployment sections.
   * @returns An array of unit DTOs with their positions and rotations set.
   */
  public deploy(): UnitDtoPartialId[] {
    const mainMetrics = this.calculateSectionMetrics(this.mainDeploymentZone);
    const forwardMetrics = this.calculateSectionMetrics(
      this.forwardDeploymentZone,
    );

    const unitsByCategory = this.getArmyCompositionByCategory(
      this.gameDataManager,
      this.units,
    );

    // Group units by deployment section in a single pass for efficiency
    const unitsByDeploymentSection =
      this.groupUnitsByDeploymentSection(unitsByCategory);

    this.deployFlank(unitsByDeploymentSection.mainGroup.flank, mainMetrics);
    this.deployCenter(unitsByDeploymentSection.mainGroup.center, mainMetrics);
    this.deployFront(unitsByDeploymentSection.mainGroup.front, mainMetrics);

    this.deployFlank(
      unitsByDeploymentSection.forwardGroup.flank,
      forwardMetrics,
    );
    this.deployCenter(
      unitsByDeploymentSection.forwardGroup.center,
      forwardMetrics,
    );
    this.deployFront(
      unitsByDeploymentSection.forwardGroup.front,
      forwardMetrics,
    );

    return this.unitDtos;
  }

  /**
   * Groups units by deployment section in a single pass for efficiency.
   * This avoids iterating through categories multiple times.
   */
  private groupUnitsByDeploymentSection(
    unitsByCategory: Partial<Record<UnitCategoryId, UnitType[]>>,
  ) {
    const mainGroup: Record<DeploymentSection, UnitType[]> = {
      flank: [],
      center: [],
      front: [],
    };
    const forwardGroup: Record<DeploymentSection, UnitType[]> = {
      flank: [],
      center: [],
      front: [],
    };

    // Single iteration through all categories
    for (const categoryId in unitsByCategory) {
      const categoryTemplate =
        this.gameDataManager.getUnitCategoryTemplate(categoryId);

      const templateDeploymentSection: DeploymentSection =
        categoryTemplate.deploymentSection ?? "center";

      const categoryUnits = unitsByCategory[categoryId] ?? [];
      for (const unitType of categoryUnits) {
        const template = this.gameDataManager
          .getUnitTemplateManager()
          .getTemplate(unitType);
        if (template.canDeployForward) {
          forwardGroup[templateDeploymentSection].push(unitType);
        } else {
          mainGroup[templateDeploymentSection].push(unitType);
        }
      }
    }

    return { mainGroup, forwardGroup };
  }

  /**
   * Adds a unit to the deployment list at the specified position.
   * @param type - The unit type to deploy.
   * @param x - The x coordinate.
   * @param y - The y coordinate.
   */
  private addUnit(type: UnitType, x: number, y: number) {
    const template = this.gameDataManager
      .getUnitTemplateManager()
      .getTemplate(type);

    this.unitDtos.push({
      player: this.player,
      pos: getClosestPointInsideZone(
        template.canDeployForward
          ? this.forwardDeploymentZone
          : this.mainDeploymentZone,
        { x, y },
      ),
      rotation: this.rotation,
      type,
    });
  }

  /**
   * Deploys units in multiple lines within a section.
   * @param units - The units to deploy.
   * @param baseY - The base Y coordinate for deployment.
   * @param startX - The starting X coordinate.
   * @param sectionWidth - The width of the section.
   * @param maxUnitsPerRow - The maximum number of units per row.
   * @param spacing - The spacing between units.
   * @param reverseY - Whether to reverse the Y direction for deployment.
   */
  private deployUnitsInLines(
    units: UnitType[],
    baseY: number,
    startX: number,
    sectionWidth: number,
    maxUnitsPerRow: number,
    spacing: number,
    reverseY: boolean,
  ) {
    const unitCount = units.length;
    const lines = Math.ceil(unitCount / maxUnitsPerRow);

    for (let lineIndex = 0; lineIndex < lines; lineIndex++) {
      const unitsInLine = Math.min(
        maxUnitsPerRow,
        unitCount - lineIndex * maxUnitsPerRow,
      );
      const totalLineWidth =
        unitsInLine * (this.DEFAULT_UNIT_HEIGHT + spacing) - spacing;
      const lineStartX = startX + (sectionWidth - totalLineWidth) / 2;

      for (let i = 0; i < unitsInLine; i++) {
        const unitIndex = lineIndex * maxUnitsPerRow + i;
        const unitType = units[unitIndex];
        const posX = lineStartX + i * (this.DEFAULT_UNIT_HEIGHT + spacing);
        const posY = reverseY
          ? baseY - lineIndex * (this.DEFAULT_UNIT_HEIGHT + this.MARGIN)
          : baseY + lineIndex * (this.DEFAULT_UNIT_HEIGHT + this.MARGIN);

        this.addUnit(unitType, posX, posY);
      }
    }
  }

  /**
   * Calculates metrics for each deployment section (left flank, center, right flank).
   * @returns A SectionMetrics object containing calculated dimensions and positions.
   */
  calculateSectionMetrics(deploymentZone: Zone): SectionMetrics {
    const { x, y, width, height } = deploymentZone;
    const leftFlankWidth = width * 0.25;
    const centerWidth = width * 0.5;
    const rightFlankWidth = width * 0.25;

    const leftFlankStartX = x;
    const centerStartX = x + leftFlankWidth;
    const rightFlankStartX = x + leftFlankWidth + centerWidth;

    // Ensure at least one unit if the section width can accommodate a unit
    const leftFlankMaxUnits = Math.max(
      1,
      Math.floor(
        leftFlankWidth / (this.DEFAULT_UNIT_HEIGHT + this.MIN_SPACING),
      ),
    );
    const centerMaxUnits = Math.max(
      1,
      Math.floor(centerWidth / (this.DEFAULT_UNIT_HEIGHT + this.MIN_SPACING)),
    );
    const rightFlankMaxUnits = Math.max(
      1,
      Math.floor(
        rightFlankWidth / (this.DEFAULT_UNIT_HEIGHT + this.MIN_SPACING),
      ),
    );

    // Adjust spacing to prevent negative values
    const leftFlankSpacing =
      leftFlankMaxUnits > 0
        ? Math.max(
            this.MIN_SPACING,
            (leftFlankWidth - leftFlankMaxUnits * this.DEFAULT_UNIT_HEIGHT) /
              (leftFlankMaxUnits > 1 ? leftFlankMaxUnits - 1 : 1),
          )
        : this.MIN_SPACING;
    const centerSpacing =
      centerMaxUnits > 0
        ? Math.max(
            this.MIN_SPACING,
            (centerWidth - centerMaxUnits * this.DEFAULT_UNIT_HEIGHT) /
              (centerMaxUnits > 1 ? centerMaxUnits - 1 : 1),
          )
        : this.MIN_SPACING;
    const rightFlankSpacing =
      rightFlankMaxUnits > 0
        ? Math.max(
            this.MIN_SPACING,
            (rightFlankWidth - rightFlankMaxUnits * this.DEFAULT_UNIT_HEIGHT) /
              (rightFlankMaxUnits > 1 ? rightFlankMaxUnits - 1 : 1),
          )
        : this.MIN_SPACING;

    const topY = this.team === 1 ? y + this.MARGIN : y + height - this.MARGIN;
    const centerY = this.team === 1 ? topY + this.MARGIN : topY - this.MARGIN;
    const frontY = this.team === 1 ? topY - this.MARGIN : topY + this.MARGIN;
    const flankY = this.team === 1 ? topY - this.MARGIN : topY + this.MARGIN;

    return {
      leftFlankWidth,
      centerWidth,
      rightFlankWidth,
      leftFlankStartX,
      centerStartX,
      rightFlankStartX,
      leftFlankMaxUnits,
      centerMaxUnits,
      rightFlankMaxUnits,
      leftFlankSpacing,
      centerSpacing,
      rightFlankSpacing,
      centerY,
      frontY,
      flankY,
    };
  }

  /**
   * Deploys units in the flank sections (left and right).
   * @param flankUnits - The units to deploy in the flanks.
   */
  private deployFlank(flankUnits: UnitType[], metrics: SectionMetrics) {
    const [flankLeft, flankRight] = divideArrayInHalf(flankUnits);

    this.deployUnitsInLines(
      flankLeft,
      metrics.flankY,
      metrics.leftFlankStartX,
      metrics.leftFlankWidth,
      metrics.leftFlankMaxUnits,
      metrics.leftFlankSpacing,
      this.team !== 1,
    );

    this.deployUnitsInLines(
      flankRight,
      metrics.flankY,
      metrics.rightFlankStartX,
      metrics.rightFlankWidth,
      metrics.rightFlankMaxUnits,
      metrics.rightFlankSpacing,
      this.team !== 1,
    );
  }

  /**
   * Deploys units in the center section.
   * @param centerUnits - The units to deploy in the center.
   */
  private deployCenter(centerUnits: UnitType[], metrics: SectionMetrics) {
    this.deployUnitsInLines(
      centerUnits,
      metrics.centerY,
      metrics.centerStartX,
      metrics.centerWidth,
      metrics.centerMaxUnits,
      metrics.centerSpacing,
      this.team !== 1,
    );
  }

  /**
   * Deploys units in the front section.
   * @param frontUnits - The units to deploy in the front.
   */
  private deployFront(frontUnits: UnitType[], metrics: SectionMetrics) {
    this.deployUnitsInLines(
      frontUnits,
      metrics.frontY,
      metrics.centerStartX,
      metrics.centerWidth,
      metrics.centerMaxUnits,
      metrics.centerSpacing,
      this.team !== 1,
    );
  }

  /**
   * Calculates the number of additional skirmishers to spawn based on the battle type and unit composition.
   * @param gameDataManager - The game data manager instance.
   * @param units - A record mapping unit types to their counts.
   * @param dynamicBattleType - The battle type.
   * @returns The number of skirmishers to spawn.
   */
  static getSkirmishersAmount(
    gameDataManager: GameDataManager,
    units: UnitCounts,
    dynamicBattleType: DynamicBattleType,
  ) {
    const skirmishRatio =
      gameDataManager.getBattleType(dynamicBattleType).skirmisherRatio;

    if (!skirmishRatio) {
      return 0;
    }

    const [skirmisherRatio, coreUnitsRatio] = skirmishRatio;

    let coreUnits: number = 0;
    let skirmishers: number = 0;

    for (const type in units) {
      const unitType: UnitType = Number(type);
      const template = gameDataManager
        .getUnitTemplateManager()
        .getTemplate(unitType);
      if (template.skirmisherRatio) {
        coreUnits += units[unitType] * template.skirmisherRatio;
      }
    }

    // Calculate skirmishers based on the ratio
    skirmishers =
      Math.floor(Math.floor(coreUnits) / coreUnitsRatio) * skirmisherRatio;

    return skirmishers;
  }

  /**
   * Groups units by their category ID.
   * @param gameDataManager - The game data manager instance.
   * @param units - A record mapping unit types to their counts.
   * @returns A record mapping category IDs to arrays of unit types.
   */
  private getArmyCompositionByCategory(
    gameDataManager: GameDataManager,
    units: UnitCounts,
  ) {
    const { skirmisherSpawning } = this.gameDataManager.getGameRules();

    if (skirmisherSpawning) {
      const additionalSkirmishers = ArmyDeployer.getSkirmishersAmount(
        this.gameDataManager,
        this.units,
        this.dynamicBattleType,
      );
      units[skirmisherSpawning.unitType] = additionalSkirmishers;
    }

    const unitsByCategory: Partial<Record<UnitCategoryId, UnitType[]>> = {};
    for (const _type in units) {
      const type: UnitType = Number(_type);
      const amount = units[type];
      const template = gameDataManager
        .getUnitTemplateManager()
        .getTemplate(type);

      const unitSet: UnitType[] = new Array(amount).fill(type);

      if (unitsByCategory[template.category as UnitCategoryId] !== undefined) {
        unitsByCategory[template.category as UnitCategoryId]!.push(...unitSet);
      } else {
        unitsByCategory[template.category as UnitCategoryId] = [...unitSet];
      }
    }

    return unitsByCategory;
  }
}
