export class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];
  private compare: (a: number, b: number) => number;

  constructor(compare: (a: number, b: number) => number = (a, b) => a - b) {
    this.compare = compare;
  }

  enqueue(item: T, priority: number): void {
    this.items.push({ item, priority });
    this.heapifyUp(this.items.length - 1);
  }

  dequeue(): T | undefined {
    const length = this.items.length;
    if (length === 0) return undefined;

    const root = this.items[0].item;
    if (length === 1) {
      this.items.pop();
      return root;
    }

    const last = this.items.pop()!;
    this.items[0] = last;
    this.heapifyDown(0);

    return root;
  }

  peek(): T | undefined {
    return this.items.length > 0 ? this.items[0].item : undefined;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items.length = 0;
  }

  private heapifyUp(index: number): void {
    const items = this.items;
    const compare = this.compare;
    let current = index;

    while (current > 0) {
      const parent = (current - 1) >> 1; // Bit shift is faster than Math.floor
      if (compare(items[current].priority, items[parent].priority) >= 0) {
        break;
      }

      // Swap using temporary variable (faster than destructuring)
      const temp = items[current];
      items[current] = items[parent];
      items[parent] = temp;
      current = parent;
    }
  }

  private heapifyDown(index: number): void {
    const items = this.items;
    const length = items.length;
    const compare = this.compare;
    let current = index;

    while (true) {
      const left = (current << 1) + 1; // Bit shift is faster than multiplication
      const right = left + 1;
      let smallest = current;

      if (left < length && compare(items[left].priority, items[smallest].priority) < 0) {
        smallest = left;
      }

      if (right < length && compare(items[right].priority, items[smallest].priority) < 0) {
        smallest = right;
      }

      if (smallest === current) {
        break;
      }

      // Swap using temporary variable (faster than destructuring)
      const temp = items[current];
      items[current] = items[smallest];
      items[smallest] = temp;
      current = smallest;
    }
  }
}
