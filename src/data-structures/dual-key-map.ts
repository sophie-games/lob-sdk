export class DualKeyMap<K1, K2, V> {
  private map = new Map<K1, Map<K2, V>>();

  set(key1: K1, key2: K2, value: V): void {
    let inner = this.map.get(key1);
    if (!inner) {
      inner = new Map<K2, V>();
      this.map.set(key1, inner);
    }
    inner.set(key2, value);
  }

  get(key1: K1, key2: K2): V | undefined {
    return this.map.get(key1)?.get(key2);
  }

  has(key1: K1, key2: K2): boolean {
    return this.map.get(key1)?.has(key2) ?? false;
  }

  delete(key1: K1, key2: K2): boolean {
    const inner = this.map.get(key1);
    if (!inner) return false;
    const deleted = inner.delete(key2);
    if (inner.size === 0) {
      this.map.delete(key1);
    }
    return deleted;
  }

  /** Delete all entries with a specific key1 */
  deleteAll(key1: K1): boolean {
    return this.map.delete(key1);
  }

  /** Iterate over all entries */
  *entries(): IterableIterator<[K1, K2, V]> {
    for (const [k1, inner] of this.map) {
      for (const [k2, v] of inner) {
        yield [k1, k2, v];
      }
    }
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
