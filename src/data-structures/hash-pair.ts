export class HashPair<T = number> {
  private pairs = new Set<string>();

  constructor(pairs: [T, T][] = []) {
    pairs.forEach(([item1, item2]) => this.addPair(item1, item2));
  }

  private hashPair(item1: T, item2: T): string {
    // Ensure consistent ordering for bidirectional pairs
    const [smaller, larger] = item1 < item2 ? [item1, item2] : [item2, item1];
    return `${smaller}:${larger}`;
  }

  addPair(item1: T, item2: T): void {
    if (item1 === item2) return; // Skip self-pairs
    this.pairs.add(this.hashPair(item1, item2));
  }

  removePair(item1: T, item2: T): void {
    this.pairs.delete(this.hashPair(item1, item2));
  }

  hasPair(item1: T, item2: T): boolean {
    return this.pairs.has(this.hashPair(item1, item2));
  }

  getAllPairs(): [T, T][] {
    return Array.from(this.pairs).map(pair => {
      const [item1, item2] = pair.split(':').map(Number) as [T, T];
      return [item1, item2];
    });
  }

  clear(): void {
    this.pairs.clear();
  }

  get size(): number {
    return this.pairs.size;
  }

  isEmpty(): boolean {
    return this.pairs.size === 0;
  }
} 