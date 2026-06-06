import { PriorityQueue } from "@lob-sdk/priority-queue";
import { TerrainType } from "@lob-sdk/types";
import { setHeightRecursively } from "@lob-sdk/utils";
import { Point2 } from "@lob-sdk/vector";
import { createNoise2D, NoiseFunction2D } from "simplex-noise";
import { aStar } from "@lob-sdk/a-star/abstract-a-star";

interface TerrainReplacement {
  fromTerrain: TerrainType;
  toTerrain: TerrainType;
}

interface TerrainCost {
  terrain: TerrainType;
  cost: number;
}

interface Neighbor {
  point: Point2;
  dist: number;
  dirHistory: number[];
}

export class NaturalPathGenerator {
  private terrainReplacements = new Map<TerrainType, TerrainType>();
  private terrainCosts = new Map<TerrainType, number>();
  private noise: NoiseFunction2D;
  private noiseFrequencyX: number;
  private noiseFrequencyY: number;

  // Pre-calculated turn cost for every direction, used to encourage smooth curves rather than hard turns
  private TURN_COST = [
    //E   SE   S    SW   W    NW   N    NE
    [0.0, 0.5, 1.0, 1.5, 2.0, 1.5, 1.0, 0.5], // E
    [0.5, 0.0, 0.5, 1.0, 1.5, 2.0, 1.5, 1.0], // SE
    [1.0, 0.5, 0.0, 0.5, 1.0, 1.5, 2.0, 1.5], // S
    [1.5, 1.0, 0.5, 0.0, 0.5, 1.0, 1.5, 2.0], // SW
    [2.0, 1.5, 1.0, 0.5, 0.0, 0.5, 1.0, 1.5], // W
    [1.5, 2.0, 1.5, 1.0, 0.5, 0.0, 0.5, 1.0], // NW
    [1.0, 1.5, 2.0, 1.5, 1.0, 0.5, 0.0, 0.5], // N
    [0.5, 1.0, 1.5, 2.0, 1.5, 1.0, 0.5, 0.0], // NE
  ];

  private DIRECTIONS = [
    { x: 1, y: 0, dist: 1 }, // 0 E
    { x: 1, y: 1, dist: Math.SQRT2 }, // 1 SE
    { x: 0, y: 1, dist: 1 }, // 2 S
    { x: -1, y: 1, dist: Math.SQRT2 }, // 3 SW
    { x: -1, y: 0, dist: 1 }, // 4 W
    { x: -1, y: -1, dist: Math.SQRT2 }, // 5 NW
    { x: 0, y: -1, dist: 1 }, // 6 N
    { x: 1, y: -1, dist: Math.SQRT2 }, // 7 NE
  ];

  constructor(
    private randomFn: () => number,
    private terrains: TerrainType[][],
    private heightMap: number[][],
    private pathTerrain: number,
    private pathHeight?: number,
    private width: number = 1,
    terrainReplacements?: TerrainReplacement[],
    terrainCosts?: TerrainCost[],
    private curveLen = 5, // how long to consider turns
    private curveWeight = 0.1, // how much to weight against turns
    private noiseWeight: number = 1,
    private noiseSmoothness: number = 6, // how many features will be generated in the noise
    private edgeDistance = 1,
    private edgeWeight = 2,
    private uphillHeightCost: number = 1,
    private downHillHeightCost: number = 1,
    heightDiffCost?: number, // only for backwards compat,
    printNoiseDebug = false,
  ) {
    if (width < 1) {
      throw new Error("Path width must be a positive number");
    }
    if (heightDiffCost) {
      this.uphillHeightCost = heightDiffCost;
      this.downHillHeightCost = heightDiffCost;
    }

    terrainReplacements?.forEach(({ fromTerrain, toTerrain }) =>
      this.terrainReplacements.set(fromTerrain, toTerrain),
    );

    terrainCosts?.forEach(({ terrain, cost }) =>
      this.terrainCosts.set(terrain, cost),
    );

    this.noise = createNoise2D(this.randomFn);
    this.noiseFrequencyX = this.noiseSmoothness / this.terrains.length;
    this.noiseFrequencyY = this.noiseSmoothness / this.terrains[0].length;

    if (printNoiseDebug) {
      this.printNoise(terrains.length, terrains[0].length);
    }
  }

  public generatePath(pathPoints: Point2[]) {
    const paths: Neighbor[][] = [];
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const shortestPath = aStar<Neighbor>({
        start: {
          point: pathPoints[i],
          dist: 0,
          dirHistory: [],
        },
        goal: {
          point: pathPoints[i + 1],
          dist: 0, // ignored but used for generic A*
          dirHistory: [], // ignored but used for generic A*
        },
        estimateFromNodeToGoal: (tile) =>
          this.heuristic(tile.point, pathPoints[i + 1]),
        neighborsAdjacentToNode: (center) => this.getNeighbors(center),
        actualCostToMove: (cameFromMap, from, to) =>
          this.calculateMoveCost(cameFromMap, from, to),
        nodeKey: (tile) => tile.point.x + tile.point.y * this.terrains.length,
      });
      paths.push(shortestPath ?? []);
    }

    paths.map((path) => this.fillPathTiles(path));
  }

  private getNeighbors(node: Neighbor): Neighbor[] {
    const neighbors = this.DIRECTIONS.map((dir, dirIndex) => ({
      point: { x: node.point.x + dir.x, y: node.point.y + dir.y },
      dist: dir.dist,
      dirHistory: this.pushDir(node.dirHistory, dirIndex),
    })).filter((p) => {
      return (
        this.validTurn(p, node) &&
        this.isValidTile(this.heightMap, p.point.x, p.point.y)
      );
    });
    return neighbors;
  }

  /** TODO: instead of using the dirHistory on the node, curve cost could be done via the cameFromMap property */
  private calculateMoveCost(
    cameFromMap: Map<any, any>,
    fromTile: Neighbor,
    toTile: Neighbor,
  ): number {
    return (
      toTile.dist +
      this.calculateTerrainCost(toTile.point) +
      this.calculateHeightDiffCost(fromTile.point, toTile.point) +
      this.calculateEdgeCost(toTile.point) +
      this.segmentCurvatureCost(toTile.dirHistory) +
      this.generateNoise(toTile.point.x, toTile.point.y)
    );
  }

  calculateEdgeCost(point: Point2): number {
    const distToEdge = Math.min(
      point.x,
      point.y,
      this.terrains.length - 1 - point.x,
      this.terrains[0].length - 1 - point.y,
    );
    return distToEdge < this.edgeDistance ? this.edgeWeight : 0; // backoff scaling created weirdness with paths not wanting to merge around edges
  }

  private generateNoise(x: number, y: number): number {
    return (
      ((this.noise(x * this.noiseFrequencyX, y * this.noiseFrequencyY) + 1) /
        2) *
      this.noiseWeight
    );
  }

  /** This is a test function that I am leaving in because it is useful for debugging/analyzing noise patterns */
  private printNoise(width: number, height: number) {
    const chars = " .:-=+*#%@"; // low → high
    for (let y = 0; y < height; y++) {
      let line = "";
      for (let x = 0; x < width; x++) {
        let n = this.generateNoise(x, y); // assumes -1..1
        n = (n + this.noiseWeight) / (this.noiseWeight * 2); // normalize to 0..1
        const index = Math.floor(n * (chars.length - 1));
        line += chars[index];
      }
      console.log(line);
    }
  }

  /** Adds direction history to a node  */
  private pushDir(dirHistory: number[], dirIndex: number): number[] {
    const h = dirHistory.slice();
    h.push(dirIndex);
    if (h.length > this.curveLen) {
      h.shift();
    }
    return h;
  }

  /** Calculates segment curve cost based on constructor params */
  private segmentCurvatureCost(history: number[]) {
    if (history.length < 2) {
      return 0;
    }

    let sum = 0;
    for (let i = 1; i < history.length; i++) {
      sum += this.TURN_COST[history[i - 1]][history[i]];
    }

    return (sum / (history.length - 1)) * this.curveWeight;
  }

  /** Prevent diagonal criss-crossing as it makes weird thick paths */
  private validTurn(goingTo: Neighbor, comingFrom: Neighbor) {
    const history = goingTo.dirHistory;
    return (
      !(
        // block criss-cross diagonals
        (
          history.length > 1 &&
          history[history.length - 2] % 2 &&
          history[history.length - 1] % 2 &&
          history[history.length - 2] !== history[history.length - 1]
        )
      ) &&
      !(
        // Block diagonals around bounds
        (
          history[history.length - 1] % 2 &&
          (comingFrom.point.x === 0 || // coming from bounds
            comingFrom.point.x === this.terrains.length - 1 ||
            comingFrom.point.y === 0 ||
            comingFrom.point.y === this.terrains[0].length - 1 ||
            goingTo.point.x === 0 || // coming from bounds
            goingTo.point.x === this.terrains.length - 1 ||
            goingTo.point.y === 0 ||
            goingTo.point.y === this.terrains[0].length - 1)
        )
      )
    );
  }

  /** Using euclidian distance as A* Hueristic */
  private heuristic(a: Point2, b: Point2): number {
    // After testing, Djisktra's just produces more reliable results and since any heuristic used was breaking the pathfinding.
    // Its unclear how this was happening since the minimum weight was was higher than these algorithms should have been producing
    return 0;
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    // return dx + dy;
    // return Math.sqrt(dx * dx + dy * dy); // Euclidian distance
    // return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy); // Octile distance
  }

  private isValidTile(grid: number[][], x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < grid.length && y < grid[0].length;
  }

  private calculateHeightDiffCost(current: Point2, neighbor: Point2): number {
    const diff =
      this.heightMap[current.x][current.y] -
      this.heightMap[neighbor.x][neighbor.y];
    if (diff > 0) {
      return Math.abs(diff) * this.uphillHeightCost;
    }
    return Math.abs(diff) * this.downHillHeightCost;
  }

  private fillPathTiles(path: Neighbor[]) {
    // Snapshot terrain before drawing so width>1 overlaps don't re-evaluate
    // replacement rules against tiles this same path already painted.
    const originalTerrains = this.terrains.map((row) => [...row]);
    for (let i = 0; i < path.length - 1; i++) {
      const start = path[i];
      const end = path[i + 1];

      // Use Bresenham's line algorithm for the center path
      const points = this.orthagonalizeLine(
        start.point.x,
        start.point.y,
        end.point.x,
        end.point.y,
      );
      for (const point of points) {
        const terrainType = this.getTerrainForTile(
          point.x,
          point.y,
          this.pathTerrain,
          originalTerrains,
        );
        this.terrains[point.x][point.y] = terrainType;

        if (this.pathHeight) {
          setHeightRecursively(
            point.x,
            point.y,
            this.pathHeight,
            this.heightMap,
          );
        }
      }
    }
  }

  private *addWidthTiles(cx: number, cy: number) {
    const halfWidth = Math.floor(this.width / 2);
    const evenAdjust = this.width % 2 === 0 ? 1 : 0;
    for (
      let offsetX = -halfWidth;
      offsetX <= halfWidth - evenAdjust;
      offsetX++
    ) {
      for (
        let offsetY = -halfWidth;
        offsetY <= halfWidth - evenAdjust;
        offsetY++
      ) {
        if (this.isValidTile(this.heightMap, cx + offsetX, cy + offsetY)) {
          yield { x: cx + offsetX, y: cy + offsetY };
        }
      }
    }
  }

  private *orthagonalizeLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): Generator<Point2> {
    let x = x0;
    let y = y0;
    yield* this.addWidthTiles(x, y);

    const dx = Math.sign(x1 - x0);
    const dy = Math.sign(y1 - y0);

    while (x !== x1 || y !== y1) {
      // Check which direction has better terrain weighting, so account for paths that get "double wide" on diagonals
      if (
        this.calculateTerrainCost({ x: x + dx, y }) <=
        this.calculateTerrainCost({ x, y: y + dy })
      ) {
        if (x !== x1) {
          x += dx;
          yield* this.addWidthTiles(x, y);
        }
        if (y !== y1) {
          y += dy;
          yield* this.addWidthTiles(x, y);
        }
      } else {
        if (y !== y1) {
          y += dy;
          yield* this.addWidthTiles(x, y);
        }
        if (x !== x1) {
          x += dx;
          yield* this.addWidthTiles(x, y);
        }
      }
    }
  }

  /**
   * Determines the appropriate terrain type for a path tile based on terrain replacement rules
   * @param x X coordinate of the tile
   * @param y Y coordinate of the tile
   * @param baseTerrain The base terrain type for the path
   * @param terrains The terrain map to check against
   * @returns The terrain type to use for this tile
   */
  private getTerrainForTile(
    x: number,
    y: number,
    baseTerrain: TerrainType,
    terrains: TerrainType[][],
  ): TerrainType {
    if (!this.terrainReplacements || !this.isValidTile(terrains, x, y)) {
      return baseTerrain;
    }
    // Find a matching replacement rule
    const replacement = this.terrainReplacements.get(terrains[x][y]);

    return replacement ? replacement : baseTerrain;
  }

  /**
   * Calculates the terrain cost for a given position
   * @param position The position to check
   * @returns The terrain cost (defaults to 1 if no cost is specified)
   */
  private calculateTerrainCost(position: Point2): number {
    return this.terrainCosts.get(this.terrains[position.x][position.y]) ?? 1;
  }
}
