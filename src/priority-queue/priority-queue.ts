/**
 * A priority queue implementation using a binary heap.
 * Items with lower priority values are dequeued first (min-heap).
 * @template T - The type of items stored in the queue.
 */
export class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];
  private compare: (a: number, b: number) => number;

  /**
   * Creates a new PriorityQueue instance.
   * @param compare - A comparison function for priorities. Defaults to (a, b) => a - b (min-heap).
   */
  constructor(compare: (a: number, b: number) => number = (a, b) => a - b) {
    this.compare = compare;
  }

  /**
   * Adds an item to the queue with the specified priority.
   * @param item - The item to add.
   * @param priority - The priority of the item (lower values have higher priority).
   */
  enqueue(item: T, priority: number): void {
    this.items.push({ item, priority });
    this.heapifyUp(this.items.length - 1);
  }

  /**
   * Removes and returns the item with the highest priority (lowest priority value).
   * @returns The item with the highest priority, or undefined if the queue is empty.
   */
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

  /**
   * Returns the item with the highest priority without removing it.
   * @returns The item with the highest priority, or undefined if the queue is empty.
   */
  peek(): T | undefined {
    return this.items.length > 0 ? this.items[0].item : undefined;
  }

  /**
   * Checks if the queue is empty.
   * @returns True if the queue is empty, false otherwise.
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Returns the number of items in the queue.
   * @returns The size of the queue.
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Removes all items from the queue.
   */
  clear(): void {
    this.items.length = 0;
  }

  /**
   * Moves an item up the heap to maintain heap property after insertion.
   * @param index - The index of the item to move up.
   */
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

  /**
   * Moves an item down the heap to maintain heap property after removal.
   * @param index - The index of the item to move down.
   */
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
