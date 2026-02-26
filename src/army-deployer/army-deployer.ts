import {
  UnitCategoryId,
  UnitDtoPartialId,
  UnitType,
  UnitCounts,
  DynamicBattleType,
  Zone,
  DeploymentZone,
} from "@lob-sdk/types";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import { DeploymentSection } from "@lob-sdk/game-data-manager";
import { divideArrayInHalf, getClosestPointInsideZone } from "@lob-sdk/utils";

/**
 * Gets the deployment cost for a unit type.
 * @param gameDataManager - The game data manager.
 * @param unitType - The unit type.
 * @returns The deployment cost (defaults to 1 if not specified).
 */
function getUnitDeploymentCost(
  gameDataManager: GameDataManager,
  unitType: number
): number {
  try {
    const template = gameDataManager
      .getUnitTemplateManager()
      .getTemplate(unitType);
    return template.deploymentCost ?? 1;
  } catch {
    return 1;
  }
}

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
 * (flank, center, front) based on their unit categories.
 */
export class ArmyDeployer {
  private readonly DEFAULT_UNIT_HEIGHT = 24;
  private readonly MIN_SPACING = 8;
  private readonly MARGIN = 12;

  private readonly units: UnitCounts;
  private readonly deploymentZone: DeploymentZone;
  private readonly allDeploymentZones: DeploymentZone[];
  private readonly forwardZones: DeploymentZone[];
  private readonly player: number;
  private readonly team: number;
  private readonly dynamicBattleType: DynamicBattleType;
  private readonly unitDtos: UnitDtoPartialId[] = [];

  private readonly metrics: SectionMetrics;
  private readonly rotation: number;
  private currentDeploymentCost: number = 0;
  private forwardZoneCosts: Map<DeploymentZone, number> = new Map();

  /**
   * Creates a new ArmyDeployer instance.
   * @param gameDataManager - The game data manager instance.
   * @param units - A record mapping unit types to their counts.
   * @param deploymentZone - The main zone where units should be deployed.
   * @param player - The player number.
   * @param team - The team number (1 or 2).
   * @param dynamicBattleType - The battle type (defaults to Combat).
   * @param allDeploymentZones - Optional array of all deployment zones for this player. Forward zones (capacity != 0) will be automatically detected.
   */
  constructor(
    private gameDataManager: GameDataManager,
    units: UnitCounts,
    deploymentZone: DeploymentZone,
    player: number,
    team: number,
    dynamicBattleType?: DynamicBattleType,
    allDeploymentZones?: DeploymentZone[]
  ) {
    this.units = units;
    this.deploymentZone = deploymentZone;
    this.allDeploymentZones = allDeploymentZones || [deploymentZone];

    // Automatically detect forward zones: zones with capacity != 0 that are not the main zone
    this.forwardZones = this.allDeploymentZones.filter(
      (zone) => zone !== deploymentZone && zone.capacity !== 0
    );

    this.player = player;
    this.team = team;
    this.dynamicBattleType =
      dynamicBattleType ??
      gameDataManager.getGameConstants().DEFAULT_BATTLE_TYPE;

    // Use zone rotation if available, otherwise fall back to team-based rotation
    if (deploymentZone.rotation !== undefined) {
      this.rotation = deploymentZone.rotation;
    } else {
      // Fallback: use team-based rotation for backward compatibility
      this.rotation =
        this.team === 1 ? 270 * (Math.PI / 180) : 90 * (Math.PI / 180);
    }

    this.metrics = this.calculateSectionMetrics();
  }

  /**
   * Deploys all units in the deployment zone according to their categories and deployment sections.
   * @returns An array of unit DTOs with their positions and rotations set.
   */
  public deploy(): UnitDtoPartialId[] {
    const unitsByCategory = this.getArmyCompositionByCategory(
      this.gameDataManager,
      this.units
    );

    // Group units by deployment section in a single pass for efficiency
    const unitsByDeploymentSection =
      this.groupUnitsByDeploymentSection(unitsByCategory);

    this.deployFlank(unitsByDeploymentSection.flank);
    this.deployCenter(unitsByDeploymentSection.center);
    this.deployFront(unitsByDeploymentSection.front);
    this.deployForward(unitsByDeploymentSection.forward);
    return this.unitDtos;
  }

  /**
   * Groups units by deployment section in a single pass for efficiency.
   * This avoids iterating through categories multiple times.
   */
  private groupUnitsByDeploymentSection(
    unitsByCategory: Partial<Record<UnitCategoryId, UnitType[]>>
  ): Record<DeploymentSection, UnitType[]> {
    const grouped: Record<DeploymentSection, UnitType[]> = {
      flank: [],
      center: [],
      forward: [],
      front: [],
    };

    // Single iteration through all categories
    for (const categoryId in unitsByCategory) {
      const categoryTemplate =
        this.gameDataManager.getUnitCategoryTemplate(categoryId);

      const templateDeploymentSection: DeploymentSection =
        categoryTemplate.deploymentSection ?? "center";

      const categoryUnits = unitsByCategory[categoryId] ?? [];
      grouped[templateDeploymentSection].push(...categoryUnits);
    }

    return grouped;
  }

  /**
   * Adds a unit to the deployment list at the specified position.
   * Checks deployment capacity before adding the unit.
   * @param type - The unit type to deploy.
   * @param x - The x coordinate (in zone-local coordinates, not rotated).
   * @param y - The y coordinate (in zone-local coordinates, not rotated).
   * @param zone - Optional zone to use for capacity checking and positioning. Defaults to main deploymentZone.
   * @returns True if the unit was added, false if capacity was exceeded.
   */
  private addUnit(type: UnitType, x: number, y: number, zone?: DeploymentZone): boolean {
    const targetZone = zone || this.deploymentZone;

    // Check deployment capacity if zone has a capacity limit (0 = infinite)
    if (targetZone.capacity > 0) {
      const unitCost = getUnitDeploymentCost(this.gameDataManager, type);

      // Use zone-specific cost tracking for forward zones
      if (zone && zone !== this.deploymentZone) {
        const currentCost = this.forwardZoneCosts.get(zone) || 0;
        if (currentCost + unitCost > zone.capacity) {
          // Capacity would be exceeded, skip this unit
          return false;
        }
        this.forwardZoneCosts.set(zone, currentCost + unitCost);
      } else {
        // Main zone capacity tracking
        if (this.currentDeploymentCost + unitCost > targetZone.capacity) {
          // Capacity would be exceeded, skip this unit
          return false;
        }
        this.currentDeploymentCost += unitCost;
      }
    }
    // x and y represent the center of the zone
    const zoneCenterX = targetZone.x;
    const zoneCenterY = targetZone.y;

    // For circular zones, always use getClosestPointInsideZone which handles circles
    const clamped = getClosestPointInsideZone(targetZone, { x, y }, 0);

    let finalX = clamped.x;
    let finalY = clamped.y;

    // If zone is rotated, rotate the clamped position around the zone center
    if (targetZone.rotation !== undefined) {
      // Convert to coordinates relative to zone center
      const localX = finalX - zoneCenterX;
      const localY = finalY - zoneCenterY;

      // Rotate around zone center
      const cos = Math.cos(targetZone.rotation);
      const sin = Math.sin(targetZone.rotation);
      const rotatedX = localX * cos - localY * sin;
      const rotatedY = localX * sin + localY * cos;

      // Convert back to global coordinates
      finalX = rotatedX + zoneCenterX;
      finalY = rotatedY + zoneCenterY;

      // Re-clamp to circle after rotation
      const reClamped = getClosestPointInsideZone(
        targetZone,
        { x: finalX, y: finalY },
        0
      );
      finalX = reClamped.x;
      finalY = reClamped.y;
    }

    this.unitDtos.push({
      player: this.player,
      pos: { x: finalX, y: finalY },
      rotation: this.rotation + Math.PI / 2,
      type,
    });

    return true;
  }

  /**
   * Deploys units in multiple lines within a section.
   * @param units - The units to deploy.
   * @param baseY - The base Y coordinate for deployment.
   * @param startX - The starting X coordinate.
   * @param sectionWidth - The width of the section.
   * @param maxUnitsPerRow - The maximum number of units per row.
   * @param spacing - The spacing between units.
   */
  private deployUnitsInLines(
    units: UnitType[],
    baseY: number,
    startX: number,
    sectionWidth: number,
    maxUnitsPerRow: number,
    spacing: number
  ) {
    const unitCount = units.length;
    const lines = Math.ceil(unitCount / maxUnitsPerRow);

    for (let lineIndex = 0; lineIndex < lines; lineIndex++) {
      const unitsInLine = Math.min(
        maxUnitsPerRow,
        unitCount - lineIndex * maxUnitsPerRow
      );
      const totalLineWidth =
        unitsInLine * (this.DEFAULT_UNIT_HEIGHT + spacing) - spacing;
      const lineStartX = startX + (sectionWidth - totalLineWidth) / 2;

      for (let i = 0; i < unitsInLine; i++) {
        const unitIndex = lineIndex * maxUnitsPerRow + i;
        const unitType = units[unitIndex];
        const posX = lineStartX + i * (this.DEFAULT_UNIT_HEIGHT + spacing);
        const posY =
          baseY + lineIndex * (this.DEFAULT_UNIT_HEIGHT + this.MARGIN);

        if (!this.addUnit(unitType, posX, posY)) {
          // Capacity exceeded, stop deploying units
          return;
        }
      }
    }
  }

  /**
   * Calculates metrics for each deployment section (left flank, center, right flank).
   * @returns A SectionMetrics object containing calculated dimensions and positions.
   */
  calculateSectionMetrics(): SectionMetrics {
    const { x, y, radius } = this.deploymentZone;
    // x and y represent the center of the zone
    const zoneCenterX = x;
    const zoneCenterY = y;

    // For circular zones, we'll use the diameter to calculate section widths
    // The sections are arranged horizontally across the circle, centered on the zone center
    const diameter = radius * 2;
    const leftFlankWidth = diameter * 0.25;
    const centerWidth = diameter * 0.5;
    const rightFlankWidth = diameter * 0.25;

    // Center sections around the zone center
    const leftFlankStartX = zoneCenterX - centerWidth / 2 - leftFlankWidth;
    const centerStartX = zoneCenterX - centerWidth / 2;
    const rightFlankStartX = zoneCenterX + centerWidth / 2;

    // Ensure at least one unit if the section width can accommodate a unit
    const leftFlankMaxUnits = Math.max(
      1,
      Math.floor(leftFlankWidth / (this.DEFAULT_UNIT_HEIGHT + this.MIN_SPACING))
    );
    const centerMaxUnits = Math.max(
      1,
      Math.floor(centerWidth / (this.DEFAULT_UNIT_HEIGHT + this.MIN_SPACING))
    );
    const rightFlankMaxUnits = Math.max(
      1,
      Math.floor(
        rightFlankWidth / (this.DEFAULT_UNIT_HEIGHT + this.MIN_SPACING)
      )
    );

    // Adjust spacing to prevent negative values
    const leftFlankSpacing =
      leftFlankMaxUnits > 0
        ? Math.max(
          this.MIN_SPACING,
          (leftFlankWidth - leftFlankMaxUnits * this.DEFAULT_UNIT_HEIGHT) /
          (leftFlankMaxUnits > 1 ? leftFlankMaxUnits - 1 : 1)
        )
        : this.MIN_SPACING;
    const centerSpacing =
      centerMaxUnits > 0
        ? Math.max(
          this.MIN_SPACING,
          (centerWidth - centerMaxUnits * this.DEFAULT_UNIT_HEIGHT) /
          (centerMaxUnits > 1 ? centerMaxUnits - 1 : 1)
        )
        : this.MIN_SPACING;
    const rightFlankSpacing =
      rightFlankMaxUnits > 0
        ? Math.max(
          this.MIN_SPACING,
          (rightFlankWidth - rightFlankMaxUnits * this.DEFAULT_UNIT_HEIGHT) /
          (rightFlankMaxUnits > 1 ? rightFlankMaxUnits - 1 : 1)
        )
        : this.MIN_SPACING;

    // Calculate Y positions centered around the zone center
    // Center section is at the zone center, front and flank are distributed around it
    const centerY = zoneCenterY;
    const frontY = zoneCenterY + this.MARGIN * 2; // Front units below center (towards map center)
    const flankY = zoneCenterY + this.MARGIN * 2;

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
   * The formations are centered vertically around the zone center.
   * @param flankUnits - The units to deploy in the flanks.
   */
  private deployFlank(flankUnits: UnitType[]) {
    const [flankLeft, flankRight] = divideArrayInHalf(flankUnits);

    // Deploy left flank
    this.deployFlankSection(
      flankLeft,
      this.metrics.leftFlankStartX,
      this.metrics.leftFlankWidth,
      this.metrics.leftFlankMaxUnits,
      this.metrics.leftFlankSpacing
    );

    // Deploy right flank
    this.deployFlankSection(
      flankRight,
      this.metrics.rightFlankStartX,
      this.metrics.rightFlankWidth,
      this.metrics.rightFlankMaxUnits,
      this.metrics.rightFlankSpacing
    );
  }

  /**
   * Deploys a single flank section (left or right), centered vertically around the zone center.
   */
  private deployFlankSection(
    units: UnitType[],
    startX: number,
    sectionWidth: number,
    maxUnitsPerRow: number,
    spacing: number
  ) {
    const unitCount = units.length;
    const lines = Math.ceil(unitCount / maxUnitsPerRow);

    // Calculate the total height of all lines to center them vertically
    const totalFormationHeight =
      lines * this.DEFAULT_UNIT_HEIGHT + (lines - 1) * this.MARGIN;

    // Start Y position so that the center of the formation is at zone center Y
    const zoneCenterY = this.deploymentZone.y;
    const startY =
      zoneCenterY - totalFormationHeight / 2 + this.DEFAULT_UNIT_HEIGHT / 2;

    for (let lineIndex = 0; lineIndex < lines; lineIndex++) {
      const unitsInLine = Math.min(
        maxUnitsPerRow,
        unitCount - lineIndex * maxUnitsPerRow
      );
      const totalLineWidth =
        unitsInLine * (this.DEFAULT_UNIT_HEIGHT + spacing) - spacing;

      // Center the line horizontally within its section
      const lineStartX = startX + (sectionWidth - totalLineWidth) / 2;
      const lineY =
        startY + lineIndex * (this.DEFAULT_UNIT_HEIGHT + this.MARGIN);

      for (let i = 0; i < unitsInLine; i++) {
        const unitIndex = lineIndex * maxUnitsPerRow + i;
        const unitType = units[unitIndex];
        const posX = lineStartX + i * (this.DEFAULT_UNIT_HEIGHT + spacing);

        if (!this.addUnit(unitType, posX, lineY)) {
          // Capacity exceeded, stop deploying units
          return;
        }
      }
    }
  }

  /**
   * Deploys units in the center section.
   * The center of the formation (both horizontally and vertically) will be at the zone center.
   * @param centerUnits - The units to deploy in the center.
   */
  private deployCenter(centerUnits: UnitType[]) {
    const unitCount = centerUnits.length;
    const lines = Math.ceil(unitCount / this.metrics.centerMaxUnits);

    // Calculate the total height of all lines to center them vertically
    const totalFormationHeight =
      lines * this.DEFAULT_UNIT_HEIGHT + (lines - 1) * this.MARGIN;

    // Start Y position so that the center of the formation is at centerY
    const startY =
      this.metrics.centerY -
      totalFormationHeight / 2 +
      this.DEFAULT_UNIT_HEIGHT / 2;

    // Deploy units, ensuring horizontal center is at zoneCenterX
    const zoneCenterX = this.deploymentZone.x;

    for (let lineIndex = 0; lineIndex < lines; lineIndex++) {
      const unitsInLine = Math.min(
        this.metrics.centerMaxUnits,
        unitCount - lineIndex * this.metrics.centerMaxUnits
      );
      const totalLineWidth =
        unitsInLine * (this.DEFAULT_UNIT_HEIGHT + this.metrics.centerSpacing) -
        this.metrics.centerSpacing;

      // Center the line horizontally at zoneCenterX
      const lineStartX = zoneCenterX - totalLineWidth / 2;
      const lineY =
        startY + lineIndex * (this.DEFAULT_UNIT_HEIGHT + this.MARGIN);

      for (let i = 0; i < unitsInLine; i++) {
        const unitIndex = lineIndex * this.metrics.centerMaxUnits + i;
        const unitType = centerUnits[unitIndex];
        const posX =
          lineStartX +
          i * (this.DEFAULT_UNIT_HEIGHT + this.metrics.centerSpacing);

        if (!this.addUnit(unitType, posX, lineY)) {
          // Capacity exceeded, stop deploying units
          return;
        }
      }
    }
  }

  private deployFront(frontUnits: UnitType[]) {
    // Deploy front units (like Artillery) regardless of forward zones
    this.deployFrontToMainZone(frontUnits);
  }

  /**
   * Deploys units in the forward section.
   * If forward zones are available, distributes units across them.
   * Otherwise, deploys in the main zone.
   * @param forwardUnits - The units to deploy in the forward section.
   */
  private deployForward(forwardUnits: UnitType[]) {
    // Add additional skirmishers if skirmisher spawning is enabled
    const { skirmisherSpawning } = this.gameDataManager.getGameRules();

    if (skirmisherSpawning) {
      const additionalSkirmishers = ArmyDeployer.getSkirmishersAmount(
        this.gameDataManager,
        this.units,
        this.dynamicBattleType
      );
      for (let i = 0; i < additionalSkirmishers; i++) {
        forwardUnits.push(skirmisherSpawning.unitType);
      }
    }

    // If forward zones are available, deploy forward units into them
    if (this.forwardZones.length > 0) {
      this.deployForwardToForwardZones(forwardUnits);
    } else {
      // Fall back to deploying in main zone
      this.deployFrontToMainZone(forwardUnits);
    }
  }

  /**
   * Deploys forward units into forward zones, distributing them across available zones.
   * @param forwardUnits - The units to deploy.
   */
  private deployForwardToForwardZones(forwardUnits: UnitType[]) {
    // Distribute units across forward zones
    const unitsPerZone = Math.ceil(
      forwardUnits.length / this.forwardZones.length
    );

    for (let zoneIndex = 0; zoneIndex < this.forwardZones.length; zoneIndex++) {
      const zone = this.forwardZones[zoneIndex];
      const startIndex = zoneIndex * unitsPerZone;
      const endIndex = Math.min(startIndex + unitsPerZone, forwardUnits.length);
      const zoneUnits = forwardUnits.slice(startIndex, endIndex);

      if (zoneUnits.length === 0) break;

      // Deploy units in this forward zone
      this.deployUnitsInForwardZone(zoneUnits, zone);
    }
  }

  /**
   * Deploys units into a specific forward zone.
   * @param units - The units to deploy.
   * @param zone - The forward zone to deploy into.
   */
  private deployUnitsInForwardZone(units: UnitType[], zone: DeploymentZone) {
    // x and y represent the center of the zone
    const zoneCenterX = zone.x;
    const zoneCenterY = zone.y;
    const zoneRadius = zone.radius;

    // Calculate how many units can fit in a row based on zone radius
    const maxUnitsPerRow = Math.max(
      1,
      Math.floor((zoneRadius * 2) / (this.DEFAULT_UNIT_HEIGHT + this.MIN_SPACING))
    );
    const spacing = Math.max(
      this.MIN_SPACING,
      maxUnitsPerRow > 1
        ? ((zoneRadius * 2) - maxUnitsPerRow * this.DEFAULT_UNIT_HEIGHT) /
        (maxUnitsPerRow - 1)
        : this.MIN_SPACING
    );

    const unitCount = units.length;
    const lines = Math.ceil(unitCount / maxUnitsPerRow);

    // Calculate the total height of all lines to center them vertically
    const totalFormationHeight =
      lines * this.DEFAULT_UNIT_HEIGHT + (lines - 1) * this.MARGIN;

    // Start Y position so that the center of the formation is at zone center Y
    const startY =
      zoneCenterY - totalFormationHeight / 2 + this.DEFAULT_UNIT_HEIGHT / 2;

    for (let lineIndex = 0; lineIndex < lines; lineIndex++) {
      const unitsInLine = Math.min(
        maxUnitsPerRow,
        unitCount - lineIndex * maxUnitsPerRow
      );
      const totalLineWidth =
        unitsInLine * (this.DEFAULT_UNIT_HEIGHT + spacing) - spacing;

      // Center the line horizontally at zoneCenterX
      const lineStartX = zoneCenterX - totalLineWidth / 2;
      const lineY =
        startY + lineIndex * (this.DEFAULT_UNIT_HEIGHT + this.MARGIN);

      for (let i = 0; i < unitsInLine; i++) {
        const unitIndex = lineIndex * maxUnitsPerRow + i;
        const unitType = units[unitIndex];
        const posX = lineStartX + i * (this.DEFAULT_UNIT_HEIGHT + spacing);

        if (!this.addUnit(unitType, posX, lineY, zone)) {
          // Capacity exceeded for this zone, stop deploying units in this zone
          return;
        }
      }
    }
  }

  /**
   * Deploys front units in the main zone (fallback when no forward zones available).
   * The formation is centered horizontally at the zone center, positioned forward from center.
   * @param frontUnits - The units to deploy in the front.
   */
  private deployFrontToMainZone(frontUnits: UnitType[]) {
    const unitCount = frontUnits.length;
    const lines = Math.ceil(unitCount / this.metrics.centerMaxUnits);

    // Calculate the total height of all lines to center them vertically
    const totalFormationHeight =
      lines * this.DEFAULT_UNIT_HEIGHT + (lines - 1) * this.MARGIN;

    // Start Y position so that the center of the formation is at frontY
    const startY =
      this.metrics.frontY -
      totalFormationHeight / 2 +
      this.DEFAULT_UNIT_HEIGHT / 2;

    // Deploy units, ensuring horizontal center is at zoneCenterX
    const zoneCenterX = this.deploymentZone.x;

    for (let lineIndex = 0; lineIndex < lines; lineIndex++) {
      const unitsInLine = Math.min(
        this.metrics.centerMaxUnits,
        unitCount - lineIndex * this.metrics.centerMaxUnits
      );
      const totalLineWidth =
        unitsInLine * (this.DEFAULT_UNIT_HEIGHT + this.metrics.centerSpacing) -
        this.metrics.centerSpacing;

      // Center the line horizontally at zoneCenterX
      const lineStartX = zoneCenterX - totalLineWidth / 2;
      const lineY =
        startY + lineIndex * (this.DEFAULT_UNIT_HEIGHT + this.MARGIN);

      for (let i = 0; i < unitsInLine; i++) {
        const unitIndex = lineIndex * this.metrics.centerMaxUnits + i;
        const unitType = frontUnits[unitIndex];
        const posX =
          lineStartX +
          i * (this.DEFAULT_UNIT_HEIGHT + this.metrics.centerSpacing);

        if (!this.addUnit(unitType, posX, lineY)) {
          // Capacity exceeded, stop deploying units
          return;
        }
      }
    }
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
    dynamicBattleType: DynamicBattleType
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
      if (template.hasSkirmishers) {
        coreUnits += units[unitType];
      }
    }

    // Calculate skirmishers based on the ratio
    skirmishers = Math.floor(coreUnits / coreUnitsRatio) * skirmisherRatio;

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
    units: UnitCounts
  ) {
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
