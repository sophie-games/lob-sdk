import { StringVector2, Vector2 } from "./vector2";

/**
 * A set data structure for Vector2 instances that uses string-based keys for efficient lookups.
 * Duplicate vectors (with the same x, y coordinates) are automatically deduplicated.
 */
export class Vector2Set {
  private map: Map<StringVector2, Vector2>;

  /**
   * Creates a new empty Vector2Set.
   */
  constructor() {
    this.map = new Map();
  }

  /**
   * Adds a vector to the set. If a vector with the same coordinates already exists, it will be replaced.
   * @param vector - The vector to add.
   */
  add(vector: Vector2): void {
    this.map.set(vector.toString(), vector);
  }

  /**
   * Checks if a vector exists in the set.
   * @param vector - The vector to check.
   * @returns True if the vector exists in the set, false otherwise.
   */
  has(vector: Vector2): boolean {
    return this.map.has(vector.toString());
  }

  /**
   * Creates a new set containing only vectors that pass the filter function.
   * @param filterFunction - A function that returns true for vectors to include.
   * @returns A new Vector2Set containing the filtered vectors.
   */
  filter(filterFunction: (value: Vector2) => boolean) {
    const newSet = new Vector2Set();

    for (const vector of this.map.values()) {
      if (filterFunction(vector)) {
        newSet.add(vector);
      }
    }

    return newSet;
  }

  /**
   * Removes all vectors from the set.
   */
  clear() {
    this.map.clear();
  }

  /**
   * Returns an iterator over the values in the set.
   * @returns An iterator of Vector2 instances.
   */
  values() {
    return this.map.values();
  }

  /**
   * Converts the set to an array of vectors.
   * @returns An array containing all vectors in the set.
   */
  toArray() {
    return Array.from(this.values());
  }
}
