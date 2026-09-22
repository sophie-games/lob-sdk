import {
  UnitCategoryId,
  UnitDtoPartialId,
  UnitType,
  UnitCounts,
  DynamicBattleType,
  Zone,
  ArmyOrganization,
} from "@lob-sdk/types";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import {
  divideArrayInHalf,
  getClosestPointInsideZone,
  rotatePointAroundZoneCenter,
} from "@lob-sdk/utils";
import {
  DivisionDoctrine,
  brigadesNeeded,
  cutIntoGroups,
  divisionsNeeded,
} from "@lob-sdk/order-of-battle";

/** A unit still to be placed, with the category that decides where it belongs. */
interface Recruit {
  type: UnitType;
  category: UnitCategoryId;
}

/** Units of frontage left between one division and the next, so the blocks read apart. */
const DIVISION_GAP = 2;

/** One line of the deployment: what stands on each wing, and what in the centre. */
interface DeployedLine {
  left: DeployedDivision[];
  centre: DeployedDivision[];
  right: DeployedDivision[];
}

/** A line's divisions in the order deployLine emits their units. */
const inDeploymentOrder = (line: DeployedLine) => [
  ...line.centre,
  ...line.left,
  ...line.right,
];

/**
 * One division as the deployer lays it out: its brigades in line, the skirmishers
 * screening it and the battery it carries. Both stand over the division's own
 * stretch of the zone, so the block a player is handed is a division.
 */
interface DeployedDivision {
  kind: string;
  brigadeKind: string;
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
    // One order of battle for the whole army, not one per zone: a division holds
    // a single stretch of the front, and the units of it that deploy forward
    // stand ahead of that same stretch rather than across the whole army.
    this.deployAsOrderOfBattle(this.getRecruits());

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
    // One pitch for both lines, so the blocks of the second sit on the same grid
    // as the first rather than on a scale of their own.
    const pitch = Math.min(this.pitchFor(all(front)), this.pitchFor(all(rear)));

    // The light cavalry rides one row ahead of the line it covers: it screened,
    // and standing it level with the infantry makes it read as part of it.
    const line = this.deployLine(front, { centre: 0, wings: -1 }, pitch);
    // One line interval behind the last infantry line, which is what the period
    // put between an infantry line and the cavalry standing behind it. The wings
    // hang off the infantry's flanks, not the zone's, so in a small battle the
    // cavalry stands beside the army instead of out at the edge of the map.
    this.deployLine(rear, { centre: depth, wings: depth }, pitch, line);
  }

  /** Width one unit gets, capped so the whole line fits the zone. */
  private pitchFor(divisions: DeployedDivision[]): number {
    if (divisions.length === 0)
      return this.DEFAULT_UNIT_HEIGHT + this.MIN_SPACING;
    const slots =
      divisions.reduce((sum, d) => sum + this.frontageOf(d), 0) +
      DIVISION_GAP * (divisions.length - 1);
    return Math.min(
      this.DEFAULT_UNIT_HEIGHT + this.MIN_SPACING,
      this.usableWidth() / slots,
    );
  }

  /** Units the widest row of a division holds, which is the frontage it needs. */
  private frontageOf(division: DeployedDivision): number {
    return Math.max(
      1,
      division.screen.length,
      division.guns.length,
      ...division.brigades.map((brigade) => brigade.length),
    );
  }

  private usableWidth(): number {
    const metrics = this.calculateSectionMetrics(this.mainDeploymentZone);
    return (
      metrics.leftFlankWidth +
      metrics.centerWidth +
      metrics.rightFlankWidth -
      2 * this.MARGIN
    );
  }

  /**
   * Lays one line of divisions out: the centre body in the middle and a wing on
   * either side of it. `anchor` is the span the wings hang off, so a second line
   * puts its cavalry beside the infantry rather than at the edge of the zone.
   * Returns the span the centre body took, for the line behind it to anchor on.
   */
  private deployLine(
    line: DeployedLine,
    rows: { centre: number; wings: number },
    pitch: number,
    anchor?: { start: number; end: number },
  ): { start: number; end: number } {
    const metrics = this.calculateSectionMetrics(this.mainDeploymentZone);
    const zoneStart = metrics.leftFlankStartX + this.MARGIN;
    const spacing = Math.max(0, pitch - this.DEFAULT_UNIT_HEIGHT);
    // A fixed gap between divisions, so the blocks read apart without the army
    // being stretched to fill whatever zone it was given.
    const gap = DIVISION_GAP * pitch;

    const widthOf = (group: DeployedDivision[]) =>
      group.reduce((sum, d) => sum + this.frontageOf(d) * pitch + gap, 0);

    const place = (
      group: DeployedDivision[],
      from: number,
      baseRow: number,
    ) => {
      let startX = from;
      for (const division of group) {
        const width = this.frontageOf(division) * pitch;
        this.deployDivision(division, startX, width, spacing, baseRow);
        startX += width + gap;
      }
    };

    const middle =
      anchor === undefined
        ? zoneStart + this.usableWidth() / 2
        : (anchor.start + anchor.end) / 2;
    const centreWidth = Math.max(0, widthOf(line.centre) - gap);
    const start = middle - centreWidth / 2;
    const end = start + centreWidth;

    // The wings hang off the anchor when there is one, so a line with nothing in
    // its centre still puts them beside the army rather than in the middle of it.
    const leftEdge = anchor?.start ?? start;
    const rightEdge = anchor?.end ?? end;

    place(line.centre, start, rows.centre);
    place(line.left, leftEdge - widthOf(line.left), rows.wings);
    place(line.right, rightEdge + gap, rows.wings);

    return { start, end };
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
    const step =
      (this.DEFAULT_UNIT_HEIGHT + this.MARGIN) * (this.team === 1 ? 1 : -1);

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
    ordered: DeployedDivision[];
  } {
    const nothing = { left: [], centre: [], right: [] };
    if (recruits.length === 0)
      return { front: nothing, rear: nothing, ordered: [] };

    const doctrine = this.gameDataManager.getOrganizationDoctrine();
    const byKind = new Map<string, Recruit[]>();
    for (const recruit of recruits) {
      const kind =
        doctrine.divisions.find((d) => d.categories.includes(recruit.category))
          ?.id ?? doctrine.defaultDivisionKind;
      const group = byKind.get(kind) ?? [];
      group.push(recruit);
      byKind.set(kind, group);
    }
    const supportKinds = new Set(
      doctrine.divisions.flatMap((d) => d.support?.map((s) => s.kind) ?? []),
    );
    const planned: {
      definition: DivisionDoctrine;
      row: "front" | "rear";
      position: "centre" | "flanks";
      divisions: DeployedDivision[];
    }[] = [];
    const plan = (definition: DivisionDoctrine, body: Recruit[]) => {
      const classes = definition.classes ?? [
        {
          categories: definition.categories,
          row: definition.row,
          position: definition.position,
        },
      ];
      const grouped = classes.map(() => [] as Recruit[]);
      for (const recruit of body) {
        const index = classes.findIndex((c) =>
          c.categories.includes(recruit.category),
        );
        grouped[Math.max(0, index)].push(recruit);
      }
      grouped.forEach((group, index) => {
        const light = group.filter((r) =>
          definition.distributedCategories?.includes(r.category),
        );
        const line = group.filter(
          (r) => !definition.distributedCategories?.includes(r.category),
        );
        const divisions = this.cutIntoDivisions(
          line.length ? line : light,
          divisionsNeeded(group.length, definition.maxTroops),
          definition.maxPerBrigade,
          definition.maxBrigades,
          definition,
        );
        if (line.length)
          light.forEach((r, i) =>
            divisions[i % divisions.length].screen.push(r),
          );
        planned.push({
          definition,
          row: classes[index].row,
          position: classes[index].position,
          divisions,
        });
      });
    };
    for (const definition of doctrine.divisions) {
      if (!supportKinds.has(definition.id))
        plan(definition, byKind.get(definition.id) ?? []);
    }
    const pace = (r: Recruit) =>
      this.gameDataManager.getUnitTemplateManager().getTemplate(r.type)
        .runMovement;
    for (const kind of supportKinds) {
      const spare = [...(byKind.get(kind) ?? [])];
      // Serve restricted support first, then distribute the rest one block per division per round.
      const recipients = planned
        .filter((p) => p.definition.support?.some((r) => r.kind === kind))
        .sort(
          (a, b) =>
            Number(
              !!b.definition.support?.find((r) => r.kind === kind)?.fasterThan,
            ) -
            Number(
              !!a.definition.support?.find((r) => r.kind === kind)?.fasterThan,
            ),
        );
      for (const body of recipients) {
        const rule = body.definition.support!.find((r) => r.kind === kind)!;
        const threshold = Math.max(
          0,
          ...(byKind.get(rule.fasterThan ?? "") ?? []).map(pace),
        );
        for (let round = 0; round < rule.maxBlocks; round++) {
          for (const division of body.divisions) {
            const at = spare.findIndex(
              (r) => !rule.fasterThan || pace(r) > threshold,
            );
            if (at >= 0) division.guns.push(...spare.splice(at, 1));
          }
        }
      }
      plan(doctrine.divisions.find((d) => d.id === kind)!, spare);
    }
    const result: { front: DeployedLine; rear: DeployedLine } = {
      front: { left: [], centre: [], right: [] },
      rear: { left: [], centre: [], right: [] },
    };
    for (const body of planned) {
      const row = result[body.row];
      if (body.position === "centre") row.centre.push(...body.divisions);
      else {
        const [left, right] = divideArrayInHalf(body.divisions);
        row.left.push(...left);
        row.right.push(...right);
      }
    }
    return {
      ...result,
      ordered: [
        ...inDeploymentOrder(result.front),
        ...inDeploymentOrder(result.rear),
      ],
    };
  }

  /** Cuts a body of troops into `divisions`, none of them over the ceiling. */
  private cutIntoDivisions(
    recruits: Recruit[],
    divisions: number,
    maxPerBrigade: number,
    maxBrigades: number,
    definition: DivisionDoctrine,
  ): DeployedDivision[] {
    if (divisions <= 0 || recruits.length === 0) return [];
    const perDivision = brigadesNeeded(
      Math.ceil(recruits.length / divisions),
      maxPerBrigade,
      maxBrigades,
    );
    const brigades = cutIntoGroups(recruits, divisions * perDivision, () => 1);

    const cut: DeployedDivision[] = [];
    for (let i = 0; i < divisions; i++) {
      const slice = brigades.slice(i * perDivision, (i + 1) * perDivision);
      if (slice.length > 0)
        cut.push({
          kind: definition.id,
          brigadeKind: definition.brigadeKind,
          brigades: slice,
          screen: [],
          guns: [],
        });
    }
    return cut;
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
    return (
      ArmyDeployer.getSkirmisherAllocation(
        gameDataManager,
        units,
        dynamicBattleType,
      )?.amount ?? 0
    );
  }

  /** The roster that actually reaches the field, including rule-generated units. */
  static getDeployedUnitCounts(
    gameDataManager: GameDataManager,
    units: UnitCounts,
    dynamicBattleType: DynamicBattleType,
  ): UnitCounts {
    const deployed = { ...units };
    const { skirmisherSpawning } = gameDataManager.getGameRules();
    if (skirmisherSpawning) {
      deployed[skirmisherSpawning.unitType] = ArmyDeployer.getSkirmishersAmount(
        gameDataManager,
        units,
        dynamicBattleType,
      );
    }
    return deployed;
  }

  /** Build the compact, editable OOB that corresponds to the default deployment. */
  static getDefaultOrganization(
    gameDataManager: GameDataManager,
    units: UnitCounts,
    dynamicBattleType: DynamicBattleType,
  ): ArmyOrganization {
    const zone: Zone = { x: 0, y: 0, width: 10000, height: 1000 };
    const deployer = new ArmyDeployer(
      gameDataManager,
      units,
      zone,
      zone,
      1,
      1,
      dynamicBattleType,
    );
    const { ordered } = deployer.planOrderOfBattle(deployer.getRecruits());
    return {
      version: 1,
      divisions: ordered.map((division) => {
        const brigades = division.brigades.map((recruits) => ({
          kind: division.brigadeKind,
          units: ArmyDeployer.countRecruits(recruits),
        }));

        for (const recruit of division.screen) {
          if (brigades.length === 0) {
            brigades.push({
              kind: division.brigadeKind,
              units: {},
            });
          }
          const weakest = brigades.reduce(
            (best, brigade, index) =>
              Object.values(brigade.units).reduce(
                (sum, count) => sum + count,
                0,
              ) <
              Object.values(brigades[best].units).reduce(
                (sum, count) => sum + count,
                0,
              )
                ? index
                : best,
            0,
          );
          brigades[weakest].units[recruit.type] =
            (brigades[weakest].units[recruit.type] ?? 0) + 1;
        }

        const support = new Map<string, Recruit[]>();
        for (const recruit of division.guns) {
          const definition = gameDataManager
            .getOrganizationDoctrine()
            .divisions.find(({ categories }) =>
              categories.includes(recruit.category),
            );
          const brigadeKind =
            definition?.brigadeKind ??
            gameDataManager.getOrganizationDoctrine().defaultBrigadeKind;
          const bucket = support.get(brigadeKind) ?? [];
          bucket.push(recruit);
          support.set(brigadeKind, bucket);
        }
        for (const [kind, recruits] of support) {
          brigades.push({ kind, units: ArmyDeployer.countRecruits(recruits) });
        }

        return { kind: division.kind, brigades };
      }),
    };
  }

  /** The weighted contribution, cost per skirmisher and next spawn threshold. */
  static getSkirmisherAllocation(
    gameDataManager: GameDataManager,
    units: UnitCounts,
    dynamicBattleType: DynamicBattleType,
  ) {
    const ratio =
      gameDataManager.getBattleType(dynamicBattleType).skirmisherRatio;
    if (!ratio || !(ratio[0] > 0) || !(ratio[1] > 0)) return null;
    const [skirmishersPerGroup, coreUnitsPerGroup] = ratio;
    let weightedTotal = 0;
    for (const [type, count] of Object.entries(units)) {
      const template = gameDataManager
        .getUnitTemplateManager()
        .getTemplate(Number(type));
      weightedTotal += count * (template.skirmisherRatio ?? 0);
    }
    const groups = Math.floor(Math.floor(weightedTotal) / coreUnitsPerGroup);
    return {
      amount: groups * skirmishersPerGroup,
      weightedTotal,
      coreUnitsPerSkirmisher: coreUnitsPerGroup / skirmishersPerGroup,
      nextBreakpoint: Math.ceil((groups + 1) * coreUnitsPerGroup),
    };
  }

  /**
   * Groups units by their category ID.
   * @param gameDataManager - The game data manager instance.
   * @param units - A record mapping unit types to their counts.
   * @returns A record mapping category IDs to arrays of unit types.
   */
  private getRecruits(): Recruit[] {
    const unitsByCategory = this.getArmyCompositionByCategory(
      this.gameDataManager,
      ArmyDeployer.getDeployedUnitCounts(
        this.gameDataManager,
        this.units,
        this.dynamicBattleType,
      ),
    );
    const recruits: Recruit[] = [];
    for (const categoryId in unitsByCategory) {
      for (const type of unitsByCategory[categoryId as UnitCategoryId] ?? []) {
        recruits.push({ type, category: categoryId as UnitCategoryId });
      }
    }
    return recruits;
  }

  private static countRecruits(recruits: Recruit[]): UnitCounts {
    const counts: UnitCounts = {};
    for (const recruit of recruits) {
      counts[recruit.type] = (counts[recruit.type] ?? 0) + 1;
    }
    return counts;
  }

  private getArmyCompositionByCategory(
    gameDataManager: GameDataManager,
    units: UnitCounts,
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
