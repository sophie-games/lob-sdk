import {
  UnitCategoryId,
  UnitDtoPartialId,
  UnitType,
  UnitCounts,
  DynamicBattleType,
  Zone,
} from "@lob-sdk/types";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import {
  divideArrayInHalf,
  getClosestPointInsideZone,
  rotatePointAroundZoneCenter,
} from "@lob-sdk/utils";
import {
  Arm,
  DIVISION_BATTERIES,
  LIGHT_INFANTRY,
  MAX_DIVISIONS,
  UNITS_PER_CAVALRY_DIVISION,
  UNITS_PER_DIVISION,
  armOf,
  brigadesPerDivision,
  cutIntoGroups,
  divisionsWanted,
  horseClassOf,
  shareDivisions,
} from "@lob-sdk/order-of-battle";

/** A unit still to be placed, with the category that decides where it belongs. */
interface Recruit {
  type: UnitType;
  category: UnitCategoryId;
}

/**
 * One division as the deployer lays it out: its brigades in line, the skirmishers
 * screening it and the battery it carries. Both stand over the division's own
 * stretch of the zone, so the block a player is handed is a division.
 */
interface DeployedDivision {
  brigades: Recruit[][];
  screen: Recruit[];
  guns: Recruit[];
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
    const unitsByCategory = this.getArmyCompositionByCategory(
      this.gameDataManager,
      this.units,
    );

    const main: Recruit[] = [];
    const forward: Recruit[] = [];
    for (const categoryId in unitsByCategory) {
      for (const type of unitsByCategory[categoryId as UnitCategoryId] ?? []) {
        const recruit = { type, category: categoryId as UnitCategoryId };
        const { canDeployForward } = this.gameDataManager
          .getUnitTemplateManager()
          .getTemplate(type);
        (canDeployForward ? forward : main).push(recruit);
      }
    }

    this.deployAsOrderOfBattle(
      main,
      this.calculateSectionMetrics(this.mainDeploymentZone),
    );
    this.deployAsOrderOfBattle(
      forward,
      this.calculateSectionMetrics(this.forwardDeploymentZone),
    );

    return this.unitDtos;
  }

  /**
   * Lays an army out as the order of battle it would have fought in: the cavalry
   * divisions on the two wings, the infantry divisions between them, each one a
   * block of its own with its brigades in line, the skirmishers screening it and
   * its battery beside them. The gaps between the blocks are what makes a
   * division read as a division on the field.
   */
  private deployAsOrderOfBattle(recruits: Recruit[], metrics: SectionMetrics) {
    const divisions = this.planOrderOfBattle(recruits);
    if (divisions.length === 0) return;

    const frontages = divisions.map((division) =>
      Math.max(
        1,
        division.screen.length + division.guns.length,
        ...division.brigades.map((brigade) => brigade.length),
      ),
    );
    const total = frontages.reduce((sum, n) => sum + n, 0);

    const usable =
      metrics.leftFlankWidth +
      metrics.centerWidth +
      metrics.rightFlankWidth -
      2 * this.MARGIN;
    // Each unit gets its natural pitch unless the zone is too narrow for the army.
    const pitch = Math.min(
      this.DEFAULT_UNIT_HEIGHT + this.MIN_SPACING,
      usable / total,
    );
    const spacing = Math.max(0, pitch - this.DEFAULT_UNIT_HEIGHT);
    // Whatever frontage the army does not need becomes the gaps between divisions.
    const gap = Math.max(0, (usable - pitch * total) / (divisions.length + 1));

    let startX = metrics.leftFlankStartX + this.MARGIN + gap;
    divisions.forEach((division, index) => {
      const width = frontages[index] * pitch;
      this.deployDivision(division, startX, width, spacing, metrics);
      startX += width + gap;
    });
  }

  /** Places one division's rows over its own stretch of the zone. */
  private deployDivision(
    division: DeployedDivision,
    startX: number,
    width: number,
    spacing: number,
    metrics: SectionMetrics,
  ) {
    const screen = [...division.screen, ...division.guns];
    if (screen.length > 0) {
      this.deployRow(screen, metrics.frontY, startX, width, spacing);
    }

    // Rows run away from the enemy, which is downwards for team 1.
    const step = (this.DEFAULT_UNIT_HEIGHT + this.MARGIN) * (this.team === 1 ? 1 : -1);
    division.brigades.forEach((brigade, index) => {
      this.deployRow(
        brigade,
        metrics.centerY + index * step,
        startX,
        width,
        spacing,
      );
    });
  }

  /** One row of a division, centred on the stretch of zone the division holds. */
  private deployRow(
    recruits: Recruit[],
    baseY: number,
    startX: number,
    width: number,
    spacing: number,
  ) {
    this.deployUnitsInLines(
      recruits.map((recruit) => recruit.type),
      baseY,
      startX,
      width,
      recruits.length,
      spacing,
      false,
    );
  }

  /**
   * Builds the order of battle an army deploys in, from the left wing to the
   * right: the cavalry divisions split between the two wings, the infantry
   * divisions in the centre, and the guns no division could take standing as the
   * reserve. It follows the same doctrine the client reads back off the field, so
   * the blocks on the ground are the divisions the order of battle panel shows.
   */
  private planOrderOfBattle(recruits: Recruit[]): DeployedDivision[] {
    if (recruits.length === 0) return [];

    const era = this.gameDataManager.era;
    const byArm = (arm: Arm) =>
      recruits.filter((recruit) => armOf(era, recruit.category) === arm);
    const foot = byArm(Arm.Foot);
    const horse = byArm(Arm.Horse);
    const guns = byArm(Arm.Guns);

    // Every division answers to a control-group key, so the two arms share them in
    // proportion to their strength once the reserve has taken one.
    const budget = MAX_DIVISIONS - (guns.length > 0 ? 1 : 0);
    const [footDivisions, horseDivisions] = shareDivisions(
      [
        divisionsWanted(foot.length, UNITS_PER_DIVISION),
        divisionsWanted(horse.length, UNITS_PER_CAVALRY_DIVISION),
      ],
      budget,
    );

    const line = foot.filter(
      (recruit) => recruit.category !== LIGHT_INFANTRY,
    );
    const light = foot.filter((recruit) => recruit.category === LIGHT_INFANTRY);
    const infantry = this.cutIntoDivisions(
      line.length > 0 ? line : light,
      footDivisions,
    );
    if (line.length > 0) {
      // A share each, the way a French division carried one legere regiment.
      light.forEach((recruit, index) => {
        infantry[index % infantry.length].screen.push(recruit);
      });
    }

    const cavalry = this.cutCavalryByType(horse, horseDivisions);
    const reserve = this.attachBatteries(guns, infantry, cavalry);

    const [leftWing, rightWing] = divideArrayInHalf(cavalry);
    const columns = [...leftWing, ...infantry, ...rightWing];
    if (reserve.length > 0) {
      columns.splice(leftWing.length + infantry.length, 0, {
        brigades: [reserve],
        screen: [],
        guns: [],
      });
    }
    return columns;
  }

  /** Cuts a body of troops into divisions of two brigades each when it is big enough. */
  private cutIntoDivisions(
    recruits: Recruit[],
    divisions: number,
  ): DeployedDivision[] {
    if (divisions <= 0 || recruits.length === 0) return [];
    const perDivision = brigadesPerDivision(recruits.length, divisions);
    const brigades = cutIntoGroups(recruits, divisions * perDivision, () => 1);

    const cut: DeployedDivision[] = [];
    for (let i = 0; i < divisions; i++) {
      const slice = brigades.slice(i * perDivision, (i + 1) * perDivision);
      if (slice.length > 0) cut.push({ brigades: slice, screen: [], guns: [] });
    }
    return cut;
  }

  /**
   * Cuts the horse into divisions of one type each. The reserve cavalry was
   * cuirassier, dragoon and light divisions; it never fielded one of each.
   */
  private cutCavalryByType(
    horse: Recruit[],
    divisions: number,
  ): DeployedDivision[] {
    const byType = new Map<number, Recruit[]>();
    for (const recruit of horse) {
      const type = horseClassOf(recruit.category);
      const group = byType.get(type);
      if (group) group.push(recruit);
      else byType.set(type, [recruit]);
    }

    const types = [...byType.values()];
    const perType = shareDivisions(
      types.map((type) =>
        divisionsWanted(type.length, UNITS_PER_CAVALRY_DIVISION),
      ),
      divisions,
    );
    return types.flatMap((type, index) =>
      this.cutIntoDivisions(type, perType[index]),
    );
  }

  /**
   * Gives each division its own batteries and returns the guns none could take.
   * A cavalry division is served first and only by horse artillery: a foot battery
   * could never keep up with it, which is why the horse batteries were raised.
   */
  private attachBatteries(
    guns: Recruit[],
    infantry: DeployedDivision[],
    cavalry: DeployedDivision[],
  ): Recruit[] {
    const pace = (recruit: Recruit) =>
      this.gameDataManager.getUnitTemplateManager().getTemplate(recruit.type)
        .runMovement;
    const footPace = Math.max(
      0,
      ...infantry.flatMap((division) =>
        division.brigades.flat().map((recruit) => pace(recruit)),
      ),
    );

    const spare = [...guns];
    // A battery each before any division gets a second, so the guns spread along
    // the line instead of massing on the first division.
    const serve = (divisions: DeployedDivision[], onlyHorse: boolean) => {
      for (let round = 0; round < DIVISION_BATTERIES; round++) {
        for (const division of divisions) {
          const at = spare.findIndex(
            (battery) => !onlyHorse || pace(battery) > footPace,
          );
          if (at < 0) return;
          division.guns.push(...spare.splice(at, 1));
        }
      }
    };

    serve(cavalry, true);
    serve(infantry, false);
    return spare;
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
    const zone = template.canDeployForward
      ? this.forwardDeploymentZone
      : this.mainDeploymentZone;
    const rotatedPosition = rotatePointAroundZoneCenter(zone, { x, y });

    this.unitDtos.push({
      player: this.player,
      pos: getClosestPointInsideZone(zone, rotatedPosition),
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
