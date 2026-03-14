import { GameTimePresetManager } from "./game-time-preset";

describe("GameTimePresetManager", () => {
  const manager = GameTimePresetManager.getInstance();

  describe("calculateTimeRemaining", () => {
    it("should return Infinity if id is missing", () => {
      expect(manager.calculateTimeRemaining(undefined, 1000, 1000)).toBe(Infinity);
      expect(manager.calculateTimeRemaining(null, 1000, 1000)).toBe(Infinity);
    });

    it("should return Infinity if turnStartedTime is missing", () => {
      expect(manager.calculateTimeRemaining("blitz", undefined, 1000)).toBe(Infinity);
      expect(manager.calculateTimeRemaining("blitz", null, 1000)).toBe(Infinity);
    });

    it("should calculate time remaining correctly", () => {
      const turnStartedTime = 900;
      const now = 1000;
      const limit = manager.getPresetTurnDurationSeconds("blitz");
      const expected = turnStartedTime + limit - now;
      expect(manager.calculateTimeRemaining("blitz", turnStartedTime, now)).toBe(expected);
    });

    it("should return negative value if time is up", () => {
      const turnStartedTime = 900;
      const now = 1200;
      const limit = manager.getPresetTurnDurationSeconds("blitz");
      const expected = turnStartedTime + limit - now;
      expect(manager.calculateTimeRemaining("blitz", turnStartedTime, now)).toBe(expected);
    });
  });

  describe("isRancid", () => {
    it("should return false if id or turnStartedTime is missing", () => {
      expect(manager.isRancid(undefined, 1000, 1000, 10)).toBe(false);
      expect(manager.isRancid("blitz", null, 1000, 10)).toBe(false);
    });

    it("should return true if turn time + margin has passed", () => {
      const turnStartedTime = 900;
      const margin = 10;
      const limit = manager.getPresetTurnDurationSeconds("blitz");
      const now = turnStartedTime + limit + margin + 1;
      expect(manager.isRancid("blitz", turnStartedTime, now, margin)).toBe(true);
    });

    it("should return false if turn time + margin has not passed", () => {
      const turnStartedTime = 900;
      const margin = 10;
      const limit = manager.getPresetTurnDurationSeconds("blitz");
      const now = turnStartedTime + limit + margin - 1;
      expect(manager.isRancid("blitz", turnStartedTime, now, margin)).toBe(false);
    });
  });

  describe("orderActiveGames", () => {
    it("should sort unplayed games first", () => {
      const games = [
        { passed: true, started: true, timeRemaining: 10 },
        { passed: false, started: true, timeRemaining: 100 },
      ];
      const sorted = manager.orderActiveGames([...games]);
      expect(sorted[0].passed).toBe(false);
    });

    it("should sort by started status second (started first)", () => {
      const games = [
        { passed: false, started: false, timeRemaining: 100 },
        { passed: false, started: true, timeRemaining: 10 },
      ];
      const sorted = manager.orderActiveGames([...games]);
      expect(sorted[0].started).toBe(true);
    });

    it("should sort by timeRemaining third", () => {
      const games = [
        { passed: false, started: true, timeRemaining: 100 },
        { passed: false, started: true, timeRemaining: 10 },
      ];
      const sorted = manager.orderActiveGames([...games]);
      expect(sorted[0].timeRemaining).toBe(10);
    });
  });
});
