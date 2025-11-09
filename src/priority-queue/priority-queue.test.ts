import { PriorityQueue } from "./priority-queue";

describe("PriorityQueue", () => {
  describe("Basic Operations", () => {
    it("should enqueue and dequeue items", () => {
      const queue = new PriorityQueue<number>();
      queue.enqueue(1, 10);
      queue.enqueue(2, 5);
      queue.enqueue(3, 15);

      expect(queue.dequeue()).toBe(2); // Lowest priority (5)
      expect(queue.dequeue()).toBe(1); // Next lowest priority (10)
      expect(queue.dequeue()).toBe(3); // Highest priority (15)
    });

    it("should return undefined when dequeuing from empty queue", () => {
      const queue = new PriorityQueue<number>();
      expect(queue.dequeue()).toBeUndefined();
    });

    it("should handle single element", () => {
      const queue = new PriorityQueue<number>();
      queue.enqueue(42, 1);
      expect(queue.dequeue()).toBe(42);
      expect(queue.isEmpty()).toBe(true);
      expect(queue.dequeue()).toBeUndefined();
    });
  });

  describe("isEmpty", () => {
    it("should return true for empty queue", () => {
      const queue = new PriorityQueue<number>();
      expect(queue.isEmpty()).toBe(true);
    });

    it("should return false for non-empty queue", () => {
      const queue = new PriorityQueue<number>();
      queue.enqueue(1, 10);
      expect(queue.isEmpty()).toBe(false);
    });

    it("should return true after dequeuing all items", () => {
      const queue = new PriorityQueue<number>();
      queue.enqueue(1, 10);
      queue.enqueue(2, 5);
      expect(queue.isEmpty()).toBe(false);
      queue.dequeue();
      expect(queue.isEmpty()).toBe(false);
      queue.dequeue();
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe("clear", () => {
    it("should clear all items from queue", () => {
      const queue = new PriorityQueue<number>();
      queue.enqueue(1, 10);
      queue.enqueue(2, 5);
      queue.enqueue(3, 15);
      expect(queue.isEmpty()).toBe(false);

      queue.clear();
      expect(queue.isEmpty()).toBe(true);
      expect(queue.dequeue()).toBeUndefined();
    });

    it("should handle clearing empty queue", () => {
      const queue = new PriorityQueue<number>();
      queue.clear();
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe("Priority Ordering (Min-Heap)", () => {
    it("should maintain min-heap property with default comparator", () => {
      const queue = new PriorityQueue<number>();
      const items = [
        { item: 1, priority: 10 },
        { item: 2, priority: 5 },
        { item: 3, priority: 15 },
        { item: 4, priority: 3 },
        { item: 5, priority: 7 },
      ];

      // Enqueue in random order
      items.forEach(({ item, priority }) => queue.enqueue(item, priority));

      // Should dequeue in priority order: 4, 2, 5, 1, 3
      expect(queue.dequeue()).toBe(4); // priority 3
      expect(queue.dequeue()).toBe(2); // priority 5
      expect(queue.dequeue()).toBe(5); // priority 7
      expect(queue.dequeue()).toBe(1); // priority 10
      expect(queue.dequeue()).toBe(3); // priority 15
    });

    it("should handle equal priorities", () => {
      const queue = new PriorityQueue<number>();
      queue.enqueue(1, 5);
      queue.enqueue(2, 5);
      queue.enqueue(3, 5);

      // With equal priorities, order may vary but all should be dequeued
      const dequeued = [queue.dequeue(), queue.dequeue(), queue.dequeue()];
      expect(dequeued.sort()).toEqual([1, 2, 3]);
      expect(queue.isEmpty()).toBe(true);
    });

    it("should handle negative priorities", () => {
      const queue = new PriorityQueue<number>();
      queue.enqueue(1, -5);
      queue.enqueue(2, 0);
      queue.enqueue(3, 5);

      expect(queue.dequeue()).toBe(1); // priority -5 (lowest)
      expect(queue.dequeue()).toBe(2); // priority 0
      expect(queue.dequeue()).toBe(3); // priority 5
    });

    it("should handle large number of items", () => {
      const queue = new PriorityQueue<number>();
      const count = 100;
      const priorities = Array.from({ length: count }, (_, i) => i);

      // Shuffle priorities
      const shuffled = [...priorities].sort(() => Math.random() - 0.5);
      shuffled.forEach((priority) => queue.enqueue(priority, priority));

      // Should dequeue in order
      for (let i = 0; i < count; i++) {
        expect(queue.dequeue()).toBe(i);
      }
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe("Custom Comparator", () => {
    it("should work with max-heap comparator", () => {
      const queue = new PriorityQueue<number>((a, b) => b - a); // Max-heap
      queue.enqueue(1, 10);
      queue.enqueue(2, 5);
      queue.enqueue(3, 15);

      expect(queue.dequeue()).toBe(3); // Highest priority (15)
      expect(queue.dequeue()).toBe(1); // Next highest priority (10)
      expect(queue.dequeue()).toBe(2); // Lowest priority (5)
    });

    it("should work with custom priority logic", () => {
      // Custom comparator that prioritizes by distance from target value (10)
      // Items closer to 10 have higher priority
      const queue = new PriorityQueue<number>((a, b) => {
        const distA = Math.abs(a - 10);
        const distB = Math.abs(b - 10);
        return distA - distB; // Lower distance = higher priority
      });

      queue.enqueue(1, 15); // distance 5 from 10
      queue.enqueue(2, 8); // distance 2 from 10
      queue.enqueue(3, 12); // distance 2 from 10
      queue.enqueue(4, 20); // distance 10 from 10

      // Should dequeue by distance from 10: 2, 3, 1, 4
      expect(queue.dequeue()).toBe(2); // priority 8 (distance 2)
      expect(queue.dequeue()).toBe(3); // priority 12 (distance 2)
      expect(queue.dequeue()).toBe(1); // priority 15 (distance 5)
      expect(queue.dequeue()).toBe(4); // priority 20 (distance 10)
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle interleaved enqueue and dequeue operations", () => {
      const queue = new PriorityQueue<number>();
      queue.enqueue(1, 10);
      queue.enqueue(2, 5);
      expect(queue.dequeue()).toBe(2);

      queue.enqueue(3, 3);
      queue.enqueue(4, 7);
      expect(queue.dequeue()).toBe(3);
      expect(queue.dequeue()).toBe(4);
      expect(queue.dequeue()).toBe(1);
    });

    it("should handle string items", () => {
      const queue = new PriorityQueue<string>();
      queue.enqueue("apple", 3);
      queue.enqueue("banana", 1);
      queue.enqueue("cherry", 2);

      expect(queue.dequeue()).toBe("banana");
      expect(queue.dequeue()).toBe("cherry");
      expect(queue.dequeue()).toBe("apple");
    });

    it("should handle object items", () => {
      interface Task {
        name: string;
        priority: number;
      }

      const queue = new PriorityQueue<Task>();
      queue.enqueue({ name: "task1", priority: 10 }, 10);
      queue.enqueue({ name: "task2", priority: 5 }, 5);
      queue.enqueue({ name: "task3", priority: 15 }, 15);

      const task2 = queue.dequeue();
      expect(task2?.name).toBe("task2");
      expect(task2?.priority).toBe(5);

      const task1 = queue.dequeue();
      expect(task1?.name).toBe("task1");
      expect(task1?.priority).toBe(10);

      const task3 = queue.dequeue();
      expect(task3?.name).toBe("task3");
      expect(task3?.priority).toBe(15);
    });

    it("should maintain heap property after multiple operations", () => {
      const queue = new PriorityQueue<number>();
      const operations = [
        { op: "enqueue" as const, item: 1, priority: 10 },
        { op: "enqueue" as const, item: 2, priority: 5 },
        { op: "dequeue" as const },
        { op: "enqueue" as const, item: 3, priority: 3 },
        { op: "enqueue" as const, item: 4, priority: 7 },
        { op: "dequeue" as const },
        { op: "enqueue" as const, item: 5, priority: 1 },
        { op: "dequeue" as const },
        { op: "dequeue" as const },
        { op: "dequeue" as const },
      ];

      const results: number[] = [];
      for (const operation of operations) {
        if (operation.op === "enqueue") {
          queue.enqueue(operation.item, operation.priority);
        } else {
          const item = queue.dequeue();
          if (item !== undefined) {
            results.push(item);
          }
        }
      }

      // Results should be in priority order: 2, 3, 5, 4, 1
      expect(results).toEqual([2, 3, 5, 4, 1]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero priority", () => {
      const queue = new PriorityQueue<number>();
      queue.enqueue(1, 0);
      queue.enqueue(2, -1);
      queue.enqueue(3, 1);

      expect(queue.dequeue()).toBe(2); // priority -1
      expect(queue.dequeue()).toBe(1); // priority 0
      expect(queue.dequeue()).toBe(3); // priority 1
    });

    it("should handle very large priorities", () => {
      const queue = new PriorityQueue<number>();
      queue.enqueue(1, Number.MAX_SAFE_INTEGER);
      queue.enqueue(2, Number.MAX_SAFE_INTEGER - 1);
      queue.enqueue(3, 0);

      expect(queue.dequeue()).toBe(3); // priority 0
      expect(queue.dequeue()).toBe(2); // priority MAX - 1
      expect(queue.dequeue()).toBe(1); // priority MAX
    });

    it("should handle very small priorities", () => {
      const queue = new PriorityQueue<number>();
      queue.enqueue(1, Number.MIN_SAFE_INTEGER);
      queue.enqueue(2, Number.MIN_SAFE_INTEGER + 1);
      queue.enqueue(3, 0);

      expect(queue.dequeue()).toBe(1); // priority MIN
      expect(queue.dequeue()).toBe(2); // priority MIN + 1
      expect(queue.dequeue()).toBe(3); // priority 0
    });
  });
});
