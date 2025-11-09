import { StringVector2, Vector2 } from "./vector2";

export class Vector2Set {
  private map: Map<StringVector2, Vector2>;

  constructor() {
    this.map = new Map();
  }

  add(vector: Vector2): void {
    this.map.set(vector.toString(), vector);
  }

  has(vector: Vector2): boolean {
    return this.map.has(vector.toString());
  }

  filter(filterFunction: (value: Vector2) => boolean) {
    const newSet = new Vector2Set();

    for (const vector of this.map.values()) {
      if (filterFunction(vector)) {
        newSet.add(vector);
      }
    }

    return newSet;
  }

  clear() {
    this.map.clear();
  }

  values() {
    return this.map.values();
  }

  toArray() {
    return Array.from(this.values());
  }
}
