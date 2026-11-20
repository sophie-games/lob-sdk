import { GameDataManager } from "@lob-sdk/game-data-manager";

describe("napoleonic map list", () => {
  const manager = GameDataManager.get("napoleonic");
  const isRandom = (name: string) => !manager.getScenario(name).map;

  it("lists every random map before any fixed one", () => {
    const list = manager.getScenarios();
    const firstFixed = list.findIndex((name) => !isRandom(name));
    expect(list.slice(firstFixed).filter(isRandom)).toEqual([]);
  });

  it("no longer ships apennine-ridges", () => {
    expect(manager.getScenarioNames()).not.toContain("apennine-ridges");
  });
});
