import { GameDataManager } from "@lob-sdk/game-data-manager";

/**
 * The scenario tracks the real clock of 18 June 1815. It opens at 11:30 and the
 * Prussians enter on the road each column used, far enough out that the march
 * lands them in action at the hour the sources give: Bülow on Lobau at 16:30,
 * Zieten and parts of Pirch at about 18:00. The limit runs half an hour past
 * the 21:00 close so the last of them fights.
 */
describe("Battle of Waterloo scenario", () => {
  const gameDataManager = GameDataManager.get("napoleonic");
  const scenario = gameDataManager.getScenario("waterloo");
  const { MINUTES_PER_TURN } = gameDataManager.getGameConstants();
  const START_MINUTES = 11 * 60 + 30;

  const clockOf = (turn: number): string => {
    const minutes = START_MINUTES + (turn - 1) * MINUTES_PER_TURN;
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
  };

  it("runs the historical day and then some", () => {
    expect(scenario.startTime).toBe("11:30");
    expect(clockOf(scenario.maxTurn!)).toBe("21:15");
  });

  it("brings each Prussian column on at the hour it crossed that ground", () => {
    const schedule = scenario.triggers!.map((trigger) => ({
      at: clockOf(Number(trigger.conditions[0]!.value)),
      units: trigger.actions
        .filter((action) => action.type === "addUnit")
        .reduce((total, action) => total + action.value.length, 0),
    }));

    // Each column starts its march at the hour that puts it into action when
    // the sources put it there: Bülow recorded attacking Lobau at 16:30, and
    // Zieten's I Corps with parts of Pirch's II Corps engaged at about 18:00.
    expect(schedule).toEqual([
      { at: "13:00", units: 0 }, // Napoleon sights the column at Chapelle-Saint-Lambert
      { at: "13:45", units: 28 }, // Bülow's leading brigades, on Lobau at 16:30
      { at: "14:15", units: 36 }, // the rest of IV Corps on the same road
      { at: "15:30", units: 17 }, // Pirch's II Corps behind Bülow, engaged 18:15
      { at: "15:45", units: 24 }, // Zieten's I Corps by Ohain, engaged 18:00
    ]);
  });

  it("reinforces with an army of foot, the way the Prussians came", () => {
    const strength = scenario
      .triggers!.flatMap((trigger) =>
        trigger.actions.filter((action) => action.type === "addUnit"),
      )
      .flatMap((action) => action.value)
      .reduce(
        (totals, unit) => {
          const template = gameDataManager
            .getUnitTemplateManager()
            .getTemplate(unit.type);
          const men = template.reportStats?.men ?? 0;
          return {
            men: totals.men + men,
            mounted:
              totals.mounted +
              (template.category.toLowerCase().includes("cavalry") ? men : 0),
          };
        },
        { men: 0, mounted: 0 },
      );

    // The Prussians brought roughly 8,000 horse to 48,000 men.
    const mountedShare = strength.mounted / strength.men;
    expect(mountedShare).toBeGreaterThan(0.15);
    expect(mountedShare).toBeLessThan(0.2);
  });

  it("gives every arriving battalion its own regimental name", () => {
    const names = scenario
      .triggers!.flatMap((trigger) =>
        trigger.actions.filter((action) => action.type === "addUnit"),
      )
      .flatMap((action) => action.value)
      .map((unit) => unit.name);

    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it("overrides whatever turn limit the battle type carries", () => {
    expect(gameDataManager.getMaxTurn("battle", scenario)).toBe(
      scenario.maxTurn,
    );
    expect(gameDataManager.getMaxTurn("battle", scenario)).not.toBe(
      gameDataManager.getMaxTurn("battle"),
    );
  });
});
