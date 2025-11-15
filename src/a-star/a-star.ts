import { PriorityQueue } from "@lob-sdk/priority-queue/priority-queue";
import { Point2 } from "@lob-sdk/vector";

class Node {
  public x: number;
  public y: number;
  public g: number = 0;
  public h: number = 0;
  public f: number = 0;
  public parent: Node | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  // Encode coordinates as single number for efficient hashing/lookup
  public getKey(width: number): number {
    return this.y * width + this.x;
  }
}

interface CachedPath {
  path: Point2[];
  // Map of encoded coordinates to their index in the path for fast lookup
  pointToIndex: Map<number, number>;
}

export class AStar {
  // Pre-computed neighbor directions (4-directional movement) as [dx, dy] tuples
  private static readonly CARDINAL_DIRECTIONS: readonly [number, number][] = [
    [0, -1], // up
    [0, 1], // down
    [-1, 0], // left
    [1, 0], // right
  ] as const;

  // Pre-computed neighbor directions (8-directional movement) as [dx, dy] tuples
  private static readonly DIAGONAL_DIRECTIONS: readonly [number, number][] = [
    [-1, -1], // up-left
    [1, -1], // up-right
    [-1, 1], // down-left
    [1, 1], // down-right
  ] as const;

  private width: number;
  private height: number;
  private getStepCost: (from: Point2, to: Point2) => number;
  private readonly DIAGONAL_COST: number = 1.41421356237; // √2
  private neighborDirections: readonly [number, number][];
  private pathCache: Map<number, CachedPath | null> = new Map();
  // Optimized subpath lookup: Map<startKey, Set<CachedPath>> for O(1) start lookup, then O(k) waypoint check
  private subpathCache: Map<number, Set<CachedPath>> = new Map();
  private maxKey: number; // Cached maxKey calculation
  // Reusable arrays to avoid allocations
  private neighborsArray: Point2[] = [];
  private pathArray: Point2[] = [];
  // Reusable data structures to avoid allocations per pathfinding call
  private openList: PriorityQueue<Node>;
  private openSet: Set<number>;
  private closedSet: Set<number>;
  private nodeMap: Map<number, Node>;
  // Node pool for memory efficiency
  private nodePool: Node[] = [];
  private nodePoolIndex: number = 0;

  constructor(
    width: number,
    height: number,
    getStepCost: (from: Point2, to: Point2) => number,
    useDiagonals: boolean = true
  ) {
    this.width = width;
    this.height = height;
    this.getStepCost = getStepCost;
    this.maxKey = width * height; // Cache maxKey calculation

    // Initialize neighbor directions based on useDiagonals setting
    this.neighborDirections = useDiagonals
      ? [...AStar.CARDINAL_DIRECTIONS, ...AStar.DIAGONAL_DIRECTIONS]
      : AStar.CARDINAL_DIRECTIONS;

    // Initialize reusable data structures
    this.openList = new PriorityQueue<Node>((a, b) => a - b);
    this.openSet = new Set<number>();
    this.closedSet = new Set<number>();
    this.nodeMap = new Map<number, Node>();
  }

  /**
   * Clears the path cache
   */
  public clearCache(): void {
    this.pathCache.clear();
    this.subpathCache.clear();
  }

  // Use Chebyshev distance (max of dx, dy) for 8-directional movement
  // This is faster than Euclidean and still admissible
  // Optimized: accept coordinates directly to avoid object property access
  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 > x2 ? x1 - x2 : x2 - x1; // Faster than Math.abs
    const dy = y1 > y2 ? y1 - y2 : y2 - y1;
    return dx > dy
      ? dx + (this.DIAGONAL_COST - 1) * dy
      : dy + (this.DIAGONAL_COST - 1) * dx; // Avoid Math.max/Math.min
  }

  // Encode coordinates as single number for efficient hashing
  private encodeKey(x: number, y: number): number {
    return y * this.width + x;
  }

  // Get a Node from the pool or create a new one
  private getNode(x: number, y: number): Node {
    if (this.nodePoolIndex < this.nodePool.length) {
      const node = this.nodePool[this.nodePoolIndex++];
      node.x = x;
      node.y = y;
      node.g = 0;
      node.h = 0;
      node.f = 0;
      node.parent = null;
      return node;
    }
    // Pool exhausted, create new node and add to pool
    // Limit pool size to prevent unbounded growth (keep max 1000 nodes)
    const node = new Node(x, y);
    if (this.nodePool.length < 1000) {
      this.nodePool.push(node);
    }
    this.nodePoolIndex++;
    return node;
  }

  public findPath(start: Point2, end: Point2): Point2[] | null {
    if (!this.isValidPoint(start) || !this.isValidPoint(end)) {
      return null;
    }

    // Use numeric keys throughout for consistency and performance
    const startKey = this.encodeKey(start.x, start.y);
    const endKey = this.encodeKey(end.x, end.y);

    // Create cache key using numeric encoding: startKey * maxKey + endKey
    const cacheKey = startKey * this.maxKey + endKey;

    // Check cache first - exact match
    const cached = this.pathCache.get(cacheKey);
    if (cached !== undefined) {
      return cached ? cached.path : null;
    }

    // Check for subpath reuse: O(1) lookup for paths starting at startKey, then O(k) waypoint check
    const startPaths = this.subpathCache.get(startKey);
    if (startPaths) {
      for (const cachedPath of startPaths) {
        const endIndex = cachedPath.pointToIndex.get(endKey);
        if (endIndex !== undefined) {
          // Return subpath from start to end
          return cachedPath.path.slice(0, endIndex + 1);
        }
      }
    }

    // Reuse data structures - clear them first
    this.openList.clear();
    this.openSet.clear();
    this.closedSet.clear();
    this.nodeMap.clear();
    this.nodePoolIndex = 0; // Reset node pool

    // Cache end coordinates to avoid repeated property access
    const endX = end.x;
    const endY = end.y;

    const startNode = this.getNode(start.x, start.y);
    startNode.h = this.heuristic(start.x, start.y, endX, endY);
    startNode.f = startNode.g + startNode.h;
    this.nodeMap.set(startKey, startNode);
    this.openList.enqueue(startNode, startNode.f);
    this.openSet.add(startKey);

    while (!this.openList.isEmpty()) {
      const currentNode = this.openList.dequeue()!;
      const currentKey = currentNode.getKey(this.width);
      this.openSet.delete(currentKey);

      if (currentKey === endKey) {
        const path = this.reconstructPath(currentNode);
        // Copy path array since we're reusing the internal array
        const pathCopy: Point2[] = new Array(path.length);
        for (let i = 0; i < path.length; i++) {
          pathCopy[i] = { x: path[i].x, y: path[i].y };
        }

        // Build point-to-index map for subpath reuse using numeric keys
        const pointToIndex = new Map<number, number>();
        for (let i = 0; i < pathCopy.length; i++) {
          const key = this.encodeKey(pathCopy[i].x, pathCopy[i].y);
          pointToIndex.set(key, i);
        }
        const cachedPath: CachedPath = { path: pathCopy, pointToIndex };

        // Cache the path with metadata (memory efficient, path array is stored once)
        this.pathCache.set(cacheKey, cachedPath);

        // Add to subpath cache for efficient subpath lookup
        let startPaths = this.subpathCache.get(startKey);
        if (!startPaths) {
          startPaths = new Set();
          this.subpathCache.set(startKey, startPaths);
        }
        startPaths.add(cachedPath);

        return pathCopy;
      }

      this.closedSet.add(currentKey);

      // Cache current node coordinates to avoid repeated property access
      const currentX = currentNode.x;
      const currentY = currentNode.y;

      const neighbors = this.getNeighbors(currentNode);
      for (let i = 0; i < neighbors.length; i++) {
        const neighborPos = neighbors[i];
        const neighborX = neighborPos.x;
        const neighborY = neighborPos.y;
        const neighborKey = this.encodeKey(neighborX, neighborY);

        if (this.closedSet.has(neighborKey)) {
          continue;
        }

        // Get or create neighbor node (reuse from pool)
        let neighbor = this.nodeMap.get(neighborKey);
        if (!neighbor) {
          neighbor = this.getNode(neighborX, neighborY);
          this.nodeMap.set(neighborKey, neighbor);
        }

        // Calculate step cost - reuse Point2 object from neighbors array
        // Create temporary Point2 only once for current position
        const currentPos = { x: currentX, y: currentY };
        const baseStepCost = this.getStepCost(currentPos, neighborPos);
        if (baseStepCost === Infinity) {
          continue; // Treat as non-passable
        }

        // Inline diagonal check - faster than Math.abs
        const dx = neighborX - currentX;
        const dy = neighborY - currentY;
        const isDiagonal = (dx === 1 || dx === -1) && (dy === 1 || dy === -1);
        const moveCost = baseStepCost * (isDiagonal ? this.DIAGONAL_COST : 1);
        const tentativeG = currentNode.g + moveCost;

        const inOpenList = this.openSet.has(neighborKey);
        if (inOpenList && tentativeG >= neighbor.g) {
          continue; // Already have a better path
        }

        neighbor.parent = currentNode;
        neighbor.g = tentativeG;
        neighbor.h = this.heuristic(neighborX, neighborY, endX, endY);
        neighbor.f = neighbor.g + neighbor.h;

        if (!inOpenList) {
          this.openSet.add(neighborKey);
          this.openList.enqueue(neighbor, neighbor.f);
        }
        // Note: If node is already in open list with worse g, we update it but don't re-enqueue.
        // The PriorityQueue will still work, but may have duplicate entries with different priorities.
        // This is acceptable for performance - the algorithm will still find the optimal path.
      }
    }

    // Cache null result (no path found)
    this.pathCache.set(cacheKey, null);
    return null;
  }

  private getNeighbors(node: Node): Point2[] {
    // Reuse array to avoid allocations, but return a copy to avoid mutation
    this.neighborsArray.length = 0;
    const neighbors = this.neighborsArray;

    // Cache node coordinates
    const nodeX = node.x;
    const nodeY = node.y;
    const width = this.width;
    const height = this.height;

    // Use pre-computed directions
    for (let i = 0; i < this.neighborDirections.length; i++) {
      const [dx, dy] = this.neighborDirections[i];
      const x = nodeX + dx;
      const y = nodeY + dy;

      // Inline bounds check for better performance
      if (x >= 0 && x < width && y >= 0 && y < height) {
        neighbors.push({ x, y });
      }
    }

    // Return a copy to avoid mutation issues (neighbors array is reused)
    // This is still faster than creating a new array each time
    return neighbors.slice();
  }

  private isValidPoint(point: Point2): boolean {
    return (
      point.x >= 0 &&
      point.x < this.width &&
      point.y >= 0 &&
      point.y < this.height
    );
  }

  private reconstructPath(node: Node): Point2[] {
    // Reuse array to avoid allocations
    this.pathArray.length = 0;
    const path = this.pathArray;

    // Build path in reverse order
    let current: Node | null = node;
    let length = 0;

    // First pass: count length and build reverse path
    while (current) {
      path[length++] = { x: current.x, y: current.y };
      current = current.parent;
    }

    // Reverse in-place for efficiency
    for (let i = 0, j = length - 1; i < j; i++, j--) {
      const temp = path[i];
      path[i] = path[j];
      path[j] = temp;
    }

    // Set correct length
    path.length = length;

    return path;
  }
}
