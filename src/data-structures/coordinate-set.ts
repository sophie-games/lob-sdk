export class CoordinateSet {
  private coordinates = new Set<string>();

  constructor(coordinates: [number, number][] = []) {
    coordinates.forEach(([x, y]) => this.add(x, y));
  }

  private hashCoordinate(x: number, y: number): string {
    return `${x},${y}`;
  }

  add(x: number, y: number): void {
    this.coordinates.add(this.hashCoordinate(x, y));
  }

  remove(x: number, y: number): void {
    this.coordinates.delete(this.hashCoordinate(x, y));
  }

  has(x: number, y: number): boolean {
    return this.coordinates.has(this.hashCoordinate(x, y));
  }

  getAllCoordinates(): [number, number][] {
    return Array.from(this.coordinates).map(coord => {
      const [x, y] = coord.split(',').map(Number);
      return [x, y] as [number, number];
    });
  }

  clear(): void {
    this.coordinates.clear();
  }

  get size(): number {
    return this.coordinates.size;
  }

  isEmpty(): boolean {
    return this.coordinates.size === 0;
  }

  // Iterator support for easy iteration
  [Symbol.iterator](): Iterator<[number, number]> {
    return this.getAllCoordinates()[Symbol.iterator]();
  }
} 