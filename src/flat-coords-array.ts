/**
 * Option 2: Flat Array Implementation
 * - Fastest iteration speed
 * - Best memory efficiency for dense coordinates
 * - O(n) lookup time but very cache-friendly
 */
export class FlatCoordsArray {
  private xs: number[] = [];
  private ys: number[] = [];

  add(x: number, y: number): boolean {
    // Linear search - can be optimized with binary search if kept sorted
    for (let i = 0; i < this.xs.length; i++) {
      if (this.xs[i] === x && this.ys[i] === y) {
        return false;
      }
    }

    this.xs.push(x);
    this.ys.push(y);
    return true;
  }

  has(x: number, y: number): boolean {
    for (let i = 0; i < this.xs.length; i++) {
      if (this.xs[i] === x && this.ys[i] === y) {
        return true;
      }
    }
    return false;
  }

  delete(x: number, y: number): boolean {
    for (let i = 0; i < this.xs.length; i++) {
      if (this.xs[i] === x && this.ys[i] === y) {
        // Fast delete by swapping with last element
        const lastIndex = this.xs.length - 1;
        if (i !== lastIndex) {
          this.xs[i] = this.xs[lastIndex];
          this.ys[i] = this.ys[lastIndex];
        }
        this.xs.pop();
        this.ys.pop();
        return true;
      }
    }
    return false;
  }

  get size(): number {
    return this.xs.length;
  }

  // Ultra-fast iteration (no object creation)
  forEach(callback: (x: number, y: number) => void): void {
    for (let i = 0; i < this.xs.length; i++) {
      callback(this.xs[i], this.ys[i]);
    }
  }

  // Zero-allocation iteration with reusable pair
  forEachFast(callback: (pair: [number, number]) => void): void {
    const pair: [number, number] = [0, 0];
    for (let i = 0; i < this.xs.length; i++) {
      pair[0] = this.xs[i];
      pair[1] = this.ys[i];
      callback(pair);
    }
  }

  *[Symbol.iterator](): Iterator<[number, number]> {
    for (let i = 0; i < this.xs.length; i++) {
      yield [this.xs[i], this.ys[i]];
    }
  }

  some(predicate: (x: number, y: number) => boolean): boolean {
    for (let i = 0; i < this.xs.length; i++) {
      if (predicate(this.xs[i], this.ys[i])) {
        return true;
      }
    }
    return false;
  }

  every(predicate: (x: number, y: number) => boolean): boolean {
    for (let i = 0; i < this.xs.length; i++) {
      if (!predicate(this.xs[i], this.ys[i])) {
        return false;
      }
    }
    return true;
  }

  toArray(): [number, number][] {
    const result: [number, number][] = new Array(this.xs.length);
    for (let i = 0; i < this.xs.length; i++) {
      result[i] = [this.xs[i], this.ys[i]];
    }
    return result;
  }

  clear(): void {
    this.xs.length = 0;
    this.ys.length = 0;
  }

  isEmpty(): boolean {
    return this.xs.length === 0;
  }
}
