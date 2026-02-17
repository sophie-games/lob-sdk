/**
 * A data structure that combines a Map and an Array to provide O(1) access by key
 * and O(1) access by index, while maintaining a stable order.
 *
 * Performance:
 * - get(key): O(1)
 * - at(index): O(1)
 * - indexOf(key): O(1)
 * - sync(values, keySelector): O(N)
 */
export class KeyedList<K, V> {
  private _order: K[] = [];
  private _map: Map<K, V> = new Map();
  private _indexMap: Map<K, number> = new Map();

  /**
   * Returns the value for a given key in O(1).
   */
  get(key: K): V | undefined {
    return this._map.get(key);
  }

  /**
   * Returns the value at a given index in O(1).
   */
  at(index: number): V | undefined {
    const key = this._order[index];
    if (key === undefined) return undefined;
    return this._map.get(key);
  }

  /**
   * Returns the stable index of a key in O(1).
   */
  indexOf(key: K): number {
    const idx = this._indexMap.get(key);
    return idx === undefined ? -1 : idx;
  }

  /**
   * Checks if the list of keys has changed compared to a set of potential values.
   */
  hasCompositionChanged<T>(values: T[], keySelector: (val: T) => K): boolean {
    if (values.length !== this._order.length) return true;
    for (const val of values) {
      if (!this._map.has(keySelector(val))) return true;
    }
    return false;
  }

  /**
   * Sets the stable order of keys. Clears the current map of values.
   */
  setOrder(keys: K[]): void {
    this._order = [...keys];
    this._map.clear();
    this._indexMap.clear();
    this._order.forEach((key, i) => {
      this._indexMap.set(key, i);
    });
  }

  /**
   * Synchronizes the values in the list with the provided set of new values,
   * maintaining the existing order of keys. Items not in the new values are removed.
   */
  sync<T extends V>(values: T[], keySelector: (val: T) => K): void {
    const newValMap = new Map(values.map((v) => [keySelector(v), v]));

    // 1. Update map with new instances
    this._map.clear();
    for (const [key, val] of newValMap) {
      if (this._indexMap.has(key)) {
        this._map.set(key, val);
      }
    }

    // 2. Remove keys from order that are no longer present
    if (this._order.length !== this._map.size) {
      this._order = this._order.filter((key) => this._map.has(key));
      this._indexMap.clear();
      this._order.forEach((key, i) => {
        this._indexMap.set(key, i);
      });
    }
  }

  /**
   * Swaps the positions of two keys in O(1).
   */
  swap(keyA: K, keyB: K): boolean {
    const idxA = this._indexMap.get(keyA);
    const idxB = this._indexMap.get(keyB);

    if (idxA === undefined || idxB === undefined) return false;

    // Swap in order array
    const temp = this._order[idxA];
    this._order[idxA] = this._order[idxB];
    this._order[idxB] = temp;

    // Update index map
    this._indexMap.set(keyA, idxB);
    this._indexMap.set(keyB, idxA);

    return true;
  }

  /**
   * Iterates through values in the stable order.
   */
  forEach(callback: (value: V, index: number, key: K) => void): void {
    this._order.forEach((key, i) => {
      const val = this._map.get(key);
      if (val !== undefined) {
        callback(val, i, key);
      }
    });
  }

  /**
   * Returns all values in the stable order.
   */
  getValues(): V[] {
    const result: V[] = [];
    this.forEach((v) => result.push(v));
    return result;
  }

  get keys(): ReadonlyArray<K> {
    return this._order;
  }

  get size(): number {
    return this._order.length;
  }
}
