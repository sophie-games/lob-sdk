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
  CAVALRY_DIVISION_BATTERIES,
  DIVISION_BATTERIES,
  LIGHT_INFANTRY,
  MAX_TROOPS_PER_CAVALRY_DIVISION,
  MAX_TROOPS_PER_DIVISION,
  MAX_UNITS_PER_BRIGADE,
  MAX_UNITS_PER_CAVALRY_BRIGADE,
  HorseClass,
  armOf,
  brigadesNeeded,
  cutIntoGroups,
  divisionsNeeded,
  horseClassOf,
} from "@lob-sdk/order-of-battle";

/** A unit still to be placed, with the category that decides where it belongs. */
interface Recruit {
  type: UnitType;
  category: UnitCategoryId;
}

/** One line of the deployment: what stands on each wing, and what in the centre. */
interface DeployedLine {
  left: DeployedDivision[];
  centre: DeployedDivision[];
  right: DeployedDivision[];
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

    const recruits: Recruit[] = [];
    for (const categoryId in unitsByCategory) {
      for (const type of unitsByCategory[categoryId as UnitCategoryId] ?? []) {
        recruits.push({ type, category: categoryId as UnitCategoryId });
      }
    }

    // One order of battle for the whole army, not one per zone: a division holds
    // a single stretch of the front, and the units of it that deploy forward
    // stand ahead of that same stretch rather than across the whole army.
    this.deployAsOrderOfBattle(recruits);

    return this.unitDtos;
  }

  /**
   * Lays an army out as the order of battle it would have fought in: the cavalry
   * divisions on the two wings, the infantry divisions between them, each one a
   * block of its own with its brigades in line, the skirmishers screening it and
   * its battery beside them. The gaps between the blocks are what makes a
   * division read as a division on the field.
   */
  private deployAsOrderOfBattle(recruits: Recruit[]) {
    const { front, rear } = this.planOrderOfBattle(recruits);
    const all = (line: DeployedLine) => [
      ...line.left,
      ...line.centre,
      ...line.right,
    ];
    if (all(front).length === 0 && all(rear).length === 0) return;

    const depth = Math.max(
      1,
      ...all(front).map((division) => division.brigades.length),
    );
    this.deployLine(front, 0);
    // One line interval behind the last infantry line, which is what the period
    // put between an infantry line and the cavalry standing behind it.
    this.deployLine(rear, depth);
  }

  /**
   * Lays one line of divisions across the zone: the wings anchored to its two
   * edges and the centre body between them, so a wing is a wing however few
   * divisions the line holds.
   */
  private deployLine(line: DeployedLine, baseRow: number) {
    const divisions = [...line.left, ...line.centre, ...line.right];
    if (divisions.length === 0) return;

    const metrics = this.calculateSectionMetrics(this.mainDeploymentZone);
    const frontage = (division: DeployedDivision) =>
      Math.max(
        1,
        division.screen.length,
        division.guns.length,
        ...division.brigades.map((brigade) => brigade.length),
      );
    const total = divisions.reduce((sum, d) => sum + frontage(d), 0);

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

    const widthOf = (group: DeployedDivision[]) =>
      group.reduce((sum, d) => sum + frontage(d) * pitch + gap, 0);

    const place = (group: DeployedDivision[], from: number) => {
      let startX = from;
      for (const division of group) {
        const width = frontage(division) * pitch;
        this.deployDivision(division, startX, width, spacing, baseRow);
        startX += width + gap;
      }
    };

    // The wings sit against the edges of the zone; the centre body is centred on
    // it, and the slack the army does not need falls between the three.
    const left = metrics.leftFlankStartX + this.MARGIN;
    place(line.left, left);
    place(line.right, left + usable - widthOf(line.right) + gap);
    place(line.centre, left + (usable - widthOf(line.centre) + gap) / 2);
  }

  /** Places one division's rows over its own stretch of the front. */
  private deployDivision(
    division: DeployedDivision,
    startX: number,
    width: number,
    spacing: number,
    baseRow: number,
  ) {
    // A row each, so both sit centred on the division rather than sharing one
    // and leaving the other pushed off to a side. A division standing behind the
    // line keeps its guns behind it too, where the rows ahead are already taken.
    const behind = baseRow > 0;
    this.deployRow(division.screen, baseRow - 2, startX, width, spacing);
    this.deployRow(
      division.guns,
      behind ? baseRow + division.brigades.length : baseRow - 1,
      startX,
      width,
      spacing,
    );
    division.brigades.forEach((brigade, index) =>
      this.deployRow(brigade, baseRow + index, startX, width, spacing),
    );
  }

  /**
   * One row of a division, centred on the stretch of front the division holds.
   * Rows count back from the first brigade line at 0; the negative ones stand
   * ahead of it, the battery at -1 and the skirmish screen at -2. A unit that
   * deploys forward takes the same row in its own zone, so it stands ahead of
   * its own division rather than of the army.
   */
  private deployRow(
    recruits: Recruit[],
    rowIndex: number,
    startX: number,
    width: number,
    spacing: number,
  ) {
    if (recruits.length === 0) return;

    const pitch = this.DEFAULT_UNIT_HEIGHT + spacing;
    const lineStartX =
      startX + (width - (recruits.length * pitch - spacing)) / 2;
    // Rows run away from the enemy, which is downwards for team 1.
    const step = (this.DEFAULT_UNIT_HEIGHT + this.MARGIN) * (this.team === 1 ? 1 : -1);

    recruits.forEach((recruit, index) => {
      const { canDeployForward } = this.gameDataManager
        .getUnitTemplateManager()
        .getTemplate(recruit.type);
      const metrics = this.calculateSectionMetrics(
        canDeployForward ? this.forwardDeploymentZone : this.mainDeploymentZone,
      );
      const y =
        rowIndex < 0
          ? metrics.frontY + (rowIndex + 1) * step
          : metrics.centerY + rowIndex * step;
      this.addUnit(recruit.type, lineStartX + index * pitch, y);
    });
  }

  /**
   * Builds the order of battle an army deploys in, from the left wing to the
   * right: the cavalry divisions split between the two wings, the infantry
   * divisions in the centre, and the guns no division could take standing as the
   * reserve. It follows the same doctrine the client reads back off the field, so
   * the blocks on the ground are the divisions the order of battle panel shows.
   */
  private planOrderOfBattle(recruits: Recruit[]): {
    front: DeployedLine;
    rear: DeployedLine;
  } {
    const nothing = { left: [], centre: [], right: [] };
    if (recruits.length === 0) return { front: nothing, rear: nothing };

    const era = this.gameDataManager.era;
    const byArm = (arm: Arm) =>
      recruits.filter((recruit) => armOf(era, recruit.category) === arm);
    const foot = byArm(Arm.Foot);
    const horse = byArm(Arm.Horse);
    const guns = byArm(Arm.Guns);

    const line = foot.filter(
      (recruit) => recruit.category !== LIGHT_INFANTRY,
    );
    const light = foot.filter((recruit) => recruit.category === LIGHT_INFANTRY);
    const infantry = this.cutIntoDivisions(
      line.length > 0 ? line : light,
      divisionsNeeded(foot.length, MAX_TROOPS_PER_DIVISION),
      MAX_UNITS_PER_BRIGADE,
    );
    if (line.length > 0) {
      // A share each, the way a French division carried one legere regiment.
      light.forEach((recruit, index) => {
        infantry[index % infantry.length].screen.push(recruit);
      });
    }

    const scouts = this.cutCavalryOf(horse, HorseClass.Light);
    const dragoons = this.cutCavalryOf(horse, HorseClass.Dragoon);
    const cuirassiers = this.cutCavalryOf(horse, HorseClass.Cuirassier);
    const reserve = this.attachBatteries(guns, infantry, [
      ...scouts,
      ...dragoons,
      ...cuirassiers,
    ]);

    // The 30th Bulletin's order, front to back: the light cavalry screening the
    // wings, the infantry, then the dragoons, then the cuirassiers massed behind
    // the centre. Splitting the heavy cavalry between the wings is Wagram, which
    // left nothing in hand to exploit the breakthrough.
    const [leftScouts, rightScouts] = divideArrayInHalf(scouts);
    const [leftDragoons, rightDragoons] = divideArrayInHalf(dragoons);

    const centre = [...cuirassiers];
    if (reserve.length > 0) {
      centre.push({ brigades: [reserve], screen: [], guns: [] });
    }
    return {
      front: { left: leftScouts, centre: infantry, right: rightScouts },
      rear: { left: leftDragoons, centre, right: rightDragoons },
    };
  }

  /** Cuts a body of troops into `divisions`, none of them over the ceiling. */
  private cutIntoDivisions(
    recruits: Recruit[],
    divisions: number,
    maxPerBrigade: number,
  ): DeployedDivision[] {
    if (divisions <= 0 || recruits.length === 0) return [];
    const perDivision = brigadesNeeded(
      Math.ceil(recruits.length / divisions),
      maxPerBrigade,
    );
    const brigades = cutIntoGroups(recruits, divisions * perDivision, () => 1);

    const cut: DeployedDivision[] = [];
    for (let i = 0; i < divisions; i++) {
      const slice = brigades.slice(i * perDivision, (i + 1) * perDivision);
      if (slice.length > 0) cut.push({ brigades: slice, screen: [], guns: [] });
    }
    return cut;
  }

  /**
   * Cuts the horse of one class into divisions. The reserve cavalry was
   * cuirassier, dragoon and light divisions; it never fielded one of each, and
   * each class stood in a different place on the field.
   */
  private cutCavalryOf(
    horse: Recruit[],
    horseClass: HorseClass,
  ): DeployedDivision[] {
    const of = horse.filter(
      (recruit) => horseClassOf(recruit.category) === horseClass,
    );
    return this.cutIntoDivisions(
      of,
      divisionsNeeded(of.length, MAX_TROOPS_PER_CAVALRY_DIVISION),
      MAX_UNITS_PER_CAVALRY_BRIGADE,
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
    const serve = (
      divisions: DeployedDivision[],
      onlyHorse: boolean,
      batteries: number,
    ) => {
      for (let round = 0; round < batteries; round++) {
        for (const division of divisions) {
          const at = spare.findIndex(
            (battery) => !onlyHorse || pace(battery) > footPace,
          );
          if (at < 0) return;
          division.guns.push(...spare.splice(at, 1));
        }
      }
    };

    serve(cavalry, true, CAVALRY_DIVISION_BATTERIES);
    serve(infantry, false, DIVISION_BATTERIES);
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
