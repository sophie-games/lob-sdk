import { DualKeyMap } from "./dual-key-map";

describe("DualKeyMap", () => {
  describe("basic operations", () => {
    it("should set and get values correctly", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      map.set("key1", 2, "value2");
      map.set("key2", 1, "value3");
      
      expect(map.get("key1", 1)).toBe("value1");
      expect(map.get("key1", 2)).toBe("value2");
      expect(map.get("key2", 1)).toBe("value3");
      expect(map.get("key2", 2)).toBeUndefined();
    });

    it("should check existence correctly", () => {
      const map = new DualKeyMap<string, number, boolean>();
      
      map.set("key1", 1, true);
      map.set("key1", 2, false);
      
      expect(map.has("key1", 1)).toBe(true);
      expect(map.has("key1", 2)).toBe(true);
      expect(map.has("key1", 3)).toBe(false);
      expect(map.has("key2", 1)).toBe(false);
    });

    it("should delete individual entries correctly", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      map.set("key1", 2, "value2");
      map.set("key2", 1, "value3");
      
      expect(map.delete("key1", 1)).toBe(true);
      expect(map.get("key1", 1)).toBeUndefined();
      expect(map.get("key1", 2)).toBe("value2");
      expect(map.get("key2", 1)).toBe("value3");
      
      expect(map.delete("key1", 1)).toBe(false); // Already deleted
      expect(map.delete("key3", 1)).toBe(false); // Non-existent
    });

    it("should delete all entries with a specific key1", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      map.set("key1", 2, "value2");
      map.set("key2", 1, "value3");
      
      expect(map.deleteAll("key1")).toBe(true);
      expect(map.get("key1", 1)).toBeUndefined();
      expect(map.get("key1", 2)).toBeUndefined();
      expect(map.get("key2", 1)).toBe("value3");
      
      expect(map.deleteAll("key1")).toBe(false); // Already deleted
    });

    it("should clear all entries", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      map.set("key1", 2, "value2");
      map.set("key2", 1, "value3");
      
      map.clear();
      
      expect(map.get("key1", 1)).toBeUndefined();
      expect(map.get("key1", 2)).toBeUndefined();
      expect(map.get("key2", 1)).toBeUndefined();
      expect(map.has("key1", 1)).toBe(false);
    });
  });

  describe("size property", () => {
    it("should return 0 for empty map", () => {
      const map = new DualKeyMap<string, number, string>();
      expect(map.size).toBe(0);
    });

    it("should return 1 for single key1 with multiple key2 values", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      expect(map.size).toBe(1);
      
      map.set("key1", 2, "value2");
      expect(map.size).toBe(1); // Still 1 because same key1
      
      map.set("key1", 3, "value3");
      expect(map.size).toBe(1); // Still 1 because same key1
    });

    it("should return correct count for multiple key1 values", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      expect(map.size).toBe(1);
      
      map.set("key2", 1, "value2");
      expect(map.size).toBe(2);
      
      map.set("key3", 1, "value3");
      expect(map.size).toBe(3);
    });

    it("should update size when entries are deleted", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      map.set("key1", 2, "value2");
      map.set("key2", 1, "value3");
      map.set("key3", 1, "value4");
      
      expect(map.size).toBe(3);
      
      // Delete individual entry - should not affect size
      map.delete("key1", 1);
      expect(map.size).toBe(3); // Still 3 because key1 still exists with key2
      
      // Delete all entries for key1 - should reduce size
      map.delete("key1", 2);
      expect(map.size).toBe(2); // Now only key2 and key3 remain
      
      // Delete all entries for key2
      map.delete("key2", 1);
      expect(map.size).toBe(1); // Now only key3 remains
    });

    it("should update size when deleteAll is used", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      map.set("key1", 2, "value2");
      map.set("key2", 1, "value3");
      map.set("key3", 1, "value4");
      
      expect(map.size).toBe(3);
      
      map.deleteAll("key1");
      expect(map.size).toBe(2);
      
      map.deleteAll("key2");
      expect(map.size).toBe(1);
      
      map.deleteAll("key3");
      expect(map.size).toBe(0);
    });

    it("should reset size to 0 when clear is called", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      map.set("key1", 2, "value2");
      map.set("key2", 1, "value3");
      map.set("key3", 1, "value4");
      
      expect(map.size).toBe(3);
      
      map.clear();
      expect(map.size).toBe(0);
    });

    it("should handle overwriting existing entries without changing size", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      expect(map.size).toBe(1);
      
      map.set("key1", 1, "value2"); // Overwrite
      expect(map.size).toBe(1); // Size unchanged
      
      map.set("key2", 1, "value3");
      expect(map.size).toBe(2);
      
      map.set("key2", 1, "value4"); // Overwrite
      expect(map.size).toBe(2); // Size unchanged
    });

    it("should work with different data types", () => {
      const map = new DualKeyMap<number, string, boolean>();
      
      map.set(1, "a", true);
      expect(map.size).toBe(1);
      
      map.set(2, "b", false);
      expect(map.size).toBe(2);
      
      map.set(1, "c", true); // Same key1, different key2
      expect(map.size).toBe(2); // Still 2
    });

    it("should handle complex scenarios with mixed operations", () => {
      const map = new DualKeyMap<string, number, string>();
      
      // Add entries
      map.set("user1", 1, "game1");
      map.set("user1", 2, "game2");
      map.set("user2", 1, "game1");
      map.set("user3", 1, "game1");
      
      expect(map.size).toBe(3); // 3 unique users
      
      // Remove user2 completely
      map.deleteAll("user2");
      expect(map.size).toBe(2);
      
      // Add user4
      map.set("user4", 1, "game1");
      expect(map.size).toBe(3);
      
      // Remove user1 from game1 but keep game2
      map.delete("user1", 1);
      expect(map.size).toBe(3); // Still 3 because user1 still exists
      
      // Remove user1 from game2 (last entry for user1)
      map.delete("user1", 2);
      expect(map.size).toBe(2); // Now only user3 and user4
    });
  });

  describe("entries iteration", () => {
    it("should iterate over all entries correctly", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      map.set("key1", 2, "value2");
      map.set("key2", 1, "value3");
      map.set("key2", 3, "value4");
      
      const entries = Array.from(map.entries());
      
      expect(entries).toHaveLength(4);
      expect(entries).toEqual(expect.arrayContaining([["key1", 1, "value1"]]));
      expect(entries).toEqual(expect.arrayContaining([["key1", 2, "value2"]]));
      expect(entries).toEqual(expect.arrayContaining([["key2", 1, "value3"]]));
      expect(entries).toEqual(expect.arrayContaining([["key2", 3, "value4"]]));
    });

    it("should handle empty map iteration", () => {
      const map = new DualKeyMap<string, number, string>();
      
      const entries = Array.from(map.entries());
      
      expect(entries).toHaveLength(0);
    });

    it("should handle single entry iteration", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      
      const entries = Array.from(map.entries());
      
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual(["key1", 1, "value1"]);
    });
  });

  describe("with different data types", () => {
    it("should work with number keys and string values", () => {
      const map = new DualKeyMap<number, number, string>();
      
      map.set(1, 10, "value1");
      map.set(2, 20, "value2");
      
      expect(map.get(1, 10)).toBe("value1");
      expect(map.get(2, 20)).toBe("value2");
      expect(map.has(1, 10)).toBe(true);
    });

    it("should work with object keys", () => {
      const map = new DualKeyMap<{ id: number }, string, boolean>();
      
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      
      map.set(obj1, "key1", true);
      map.set(obj2, "key2", false);
      
      expect(map.get(obj1, "key1")).toBe(true);
      expect(map.get(obj2, "key2")).toBe(false);
      expect(map.has(obj1, "key1")).toBe(true);
    });

    it("should work with mixed types", () => {
      const map = new DualKeyMap<string, number, { data: string }>();
      
      map.set("key1", 1, { data: "value1" });
      map.set("key2", 2, { data: "value2" });
      
      expect(map.get("key1", 1)).toEqual({ data: "value1" });
      expect(map.get("key2", 2)).toEqual({ data: "value2" });
    });
  });

  describe("edge cases", () => {
    it("should handle undefined and null values", () => {
      const map = new DualKeyMap<string, number, any>();
      
      map.set("key1", 1, undefined);
      map.set("key2", 2, null);
      
      expect(map.get("key1", 1)).toBeUndefined();
      expect(map.get("key2", 2)).toBeNull();
      expect(map.has("key1", 1)).toBe(true);
      expect(map.has("key2", 2)).toBe(true);
    });

    it("should handle overwriting existing values", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      map.set("key1", 1, "value2"); // Overwrite
      
      expect(map.get("key1", 1)).toBe("value2");
      expect(map.has("key1", 1)).toBe(true);
    });

    it("should handle deletion of non-existent entries", () => {
      const map = new DualKeyMap<string, number, string>();
      
      expect(map.delete("key1", 1)).toBe(false);
      expect(map.deleteAll("key1")).toBe(false);
    });

    it("should handle get on non-existent keys", () => {
      const map = new DualKeyMap<string, number, string>();
      
      expect(map.get("key1", 1)).toBeUndefined();
      expect(map.has("key1", 1)).toBe(false);
    });
  });

  describe("memory management", () => {
    it("should clean up empty inner maps after deletion", () => {
      const map = new DualKeyMap<string, number, string>();
      
      map.set("key1", 1, "value1");
      map.set("key1", 2, "value2");
      
      // Delete all entries for key1
      map.delete("key1", 1);
      map.delete("key1", 2);
      
      // The inner map should be cleaned up
      expect(map.has("key1", 1)).toBe(false);
      expect(map.has("key1", 2)).toBe(false);
    });

    it("should handle multiple operations on same keys", () => {
      const map = new DualKeyMap<string, number, string>();
      
      // Set multiple values
      for (let i = 0; i < 10; i++) {
        map.set("key1", i, `value${i}`);
      }
      
      // Verify all values
      for (let i = 0; i < 10; i++) {
        expect(map.get("key1", i)).toBe(`value${i}`);
      }
      
      // Delete all
      for (let i = 0; i < 10; i++) {
        expect(map.delete("key1", i)).toBe(true);
      }
      
      // Verify all deleted
      for (let i = 0; i < 10; i++) {
        expect(map.has("key1", i)).toBe(false);
      }
    });
  });

  describe("performance characteristics", () => {
    it("should handle large number of entries efficiently", () => {
      const map = new DualKeyMap<number, number, string>();
      const size = 1000;
      
      // Add entries
      for (let i = 0; i < size; i++) {
        map.set(i, i * 2, `value${i}`);
      }
      
      // Verify all entries
      for (let i = 0; i < size; i++) {
        expect(map.get(i, i * 2)).toBe(`value${i}`);
      }
      
      // Count entries
      const entries = Array.from(map.entries());
      expect(entries).toHaveLength(size);
    });

    it("should handle nested iteration efficiently", () => {
      const map = new DualKeyMap<string, string, number>();
      
      // Create a grid of entries
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          map.set(`row${i}`, `col${j}`, i * 10 + j);
        }
      }
      
      const entries = Array.from(map.entries());
      expect(entries).toHaveLength(100);
      
      // Verify some specific entries
      expect(map.get("row5", "col3")).toBe(53);
      expect(map.get("row0", "col9")).toBe(9);
    });
  });
});
