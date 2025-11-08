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
    if (this.isEmpty()) return undefined;

    const root = this.items[0].item;
    const last = this.items.pop();
    if (this.isEmpty()) return root;

    this.items[0] = last!;
    this.heapifyDown(0);

    return root;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  clear(): void {
    this.items.length = 0;
  }

  private heapifyUp(index: number): void {
    const parentIndex = Math.floor((index - 1) / 2);
    if (
      index > 0 &&
      this.compare(
        this.items[index].priority,
        this.items[parentIndex].priority
      ) < 0
    ) {
      [this.items[index], this.items[parentIndex]] = [
        this.items[parentIndex],
        this.items[index],
      ];
      this.heapifyUp(parentIndex);
    }
  }

  private heapifyDown(index: number): void {
    const leftIndex = 2 * index + 1;
    const rightIndex = 2 * index + 2;
    let smallest = index;

    if (
      leftIndex < this.items.length &&
      this.compare(
        this.items[leftIndex].priority,
        this.items[smallest].priority
      ) < 0
    ) {
      smallest = leftIndex;
    }

    if (
      rightIndex < this.items.length &&
      this.compare(
        this.items[rightIndex].priority,
        this.items[smallest].priority
      ) < 0
    ) {
      smallest = rightIndex;
    }

    if (smallest !== index) {
      [this.items[index], this.items[smallest]] = [
        this.items[smallest],
        this.items[index],
      ];
      this.heapifyDown(smallest);
    }
  }
}
