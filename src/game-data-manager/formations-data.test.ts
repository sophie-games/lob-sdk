import { GameDataManager } from "@lob-sdk/game-data-manager";
import napoleonicFormations from "@lob-sdk/game-data/eras/napoleonic/formations.json";

/**
 * Guards against the flankMin/flankMax vs minFlankAngle/maxFlankAngle key
 * mismatch. The engine (BaseUnit.getFlankMod) and the scenario editor read
 * `minFlankAngle`/`maxFlankAngle`; if the data uses the legacy `flankMin`/
 * `flankMax` keys instead, the configured angles are silently ignored (the
 * engine falls back to 45/135) and the editor renders the fields blank.
 */
describe("napoleonic formation data: flank-angle keys", () => {
  it("uses no legacy flankMin/flankMax keys", () => {
    for (const f of napoleonicFormations as Array<Record<string, unknown>>) {
      expect(f).not.toHaveProperty("flankMin");
      expect(f).not.toHaveProperty("flankMax");
    }
  });

  it("exposes the canonical minFlankAngle/maxFlankAngle the engine reads", () => {
    const fm = GameDataManager.get("napoleonic").getFormationManager();
    const line = fm.getTemplate("line");
    expect(line?.minFlankAngle).toBe(60);
    expect(line?.maxFlankAngle).toBe(120);
    const square = fm.getTemplate("square");
    expect(square?.minFlankAngle).toBe(180);
    expect(square?.maxFlankAngle).toBe(180);
  });
});
