import { GameSpeed } from "../game-time-preset/game-time-preset";
import { getEloRangeByTime } from "./matchmaking";

describe("getEloRangeByTime()", () => {
  describe("Fast (interval = 10s)", () => {
    it("returns 100 for a date less than 10 seconds ago", () => {
      const now = new Date("2025-04-20T12:00:00Z");
      const createdAt = new Date("2025-04-20T11:59:55Z"); // 5 seconds ago
      expect(getEloRangeByTime(createdAt.getTime(), now.getTime(), GameSpeed.Fast)).toBe(100);
    });

    it("returns 140 after 10 seconds", () => {
      const now = new Date("2025-04-20T12:00:00Z");
      const createdAt = new Date("2025-04-20T11:59:50Z"); // 10 seconds ago
      expect(getEloRangeByTime(createdAt.getTime(), now.getTime(), GameSpeed.Fast)).toBe(140);
    });

    it("returns 180 after 20 seconds", () => {
      const now = new Date("2025-04-20T12:00:00Z");
      const createdAt = new Date("2025-04-20T11:59:40Z"); // 20 seconds ago
      expect(getEloRangeByTime(createdAt.getTime(), now.getTime(), GameSpeed.Fast)).toBe(180);
    });

    it("returns 300 after 50 seconds", () => {
      const now = new Date("2025-04-20T12:00:00Z");
      const createdAt = new Date("2025-04-20T11:59:10Z"); // 50 seconds ago
      expect(getEloRangeByTime(createdAt.getTime(), now.getTime(), GameSpeed.Fast)).toBe(300);
    });

    it("grows without cap for a date 1 hour in the past (3600 / 10 = 360 increments)", () => {
      const now = new Date("2025-04-20T12:00:00Z");
      const createdAt = new Date("2025-04-20T11:00:00Z"); // 1 hour ago
      // 100 + 360 * 40 = 14500
      expect(getEloRangeByTime(createdAt.getTime(), now.getTime(), GameSpeed.Fast)).toBe(14500);
    });
  });

  describe("Slow (interval = 60s)", () => {
    it("returns 100 for a date less than 60 seconds ago", () => {
      const now = new Date("2025-04-20T12:00:00Z");
      const createdAt = new Date("2025-04-20T11:59:30Z"); // 30 seconds ago
      expect(getEloRangeByTime(createdAt.getTime(), now.getTime(), GameSpeed.Slow)).toBe(100);
    });

    it("returns 300 after 5 minutes", () => {
      const now = new Date("2025-04-20T12:00:00Z");
      const createdAt = new Date("2025-04-20T11:55:00Z"); // 5 minutes ago
      // 100 + 5 * 40 = 300
      expect(getEloRangeByTime(createdAt.getTime(), now.getTime(), GameSpeed.Slow)).toBe(300);
    });

    it("returns 1300 after 30 minutes", () => {
      const now = new Date("2025-04-20T12:00:00Z");
      const createdAt = new Date("2025-04-20T11:30:00Z"); // 30 minutes ago
      // 100 + 30 * 40 = 1300
      expect(getEloRangeByTime(createdAt.getTime(), now.getTime(), GameSpeed.Slow)).toBe(1300);
    });

    it("returns 2500 after 1 hour (saturates spectrum)", () => {
      const now = new Date("2025-04-20T12:00:00Z");
      const createdAt = new Date("2025-04-20T11:00:00Z"); // 1 hour ago
      // 100 + 60 * 40 = 2500
      expect(getEloRangeByTime(createdAt.getTime(), now.getTime(), GameSpeed.Slow)).toBe(2500);
    });
  });

  it("clamps negative time differences to 0 (returns BASE)", () => {
    const now = new Date("2025-04-20T12:00:00Z");
    const createdAt = new Date("2025-04-20T12:00:30Z"); // 30 seconds in the future
    expect(getEloRangeByTime(createdAt.getTime(), now.getTime(), GameSpeed.Fast)).toBe(100);
    expect(getEloRangeByTime(createdAt.getTime(), now.getTime(), GameSpeed.Slow)).toBe(100);
  });
});
