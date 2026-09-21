import { GameDataManager } from "@lob-sdk/game-data-manager";

/**
 * The fixed 11:30 deployment is split by historical field command. Passing turn
 * 0 preserves it verbatim; moving units gives each commander a bounded sector.
 * Prussian triggers represent the formations that reached Waterloo rather than
 * assigning the whole Prussian army to Wellington's player.
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

  const reinforcements = scenario
    .triggers!.flatMap((trigger) =>
      trigger.actions.filter((action) => action.type === "addUnit"),
    )
    .flatMap((action) => action.value);

  it("runs the historical day and then some", () => {
    expect(scenario.startTime).toBe("11:30");
    expect(clockOf(scenario.maxTurn!)).toBe("21:15");
  });

  it("has thirteen command seats grouped at corps and reserve level", () => {
    expect(scenario.players).toHaveLength(13);
    expect(scenario.players!.filter((player) => player.team === 1)).toHaveLength(
      6,
    );
    expect(scenario.players!.filter((player) => player.team === 2)).toHaveLength(
      7,
    );

    const divisionOwner = new Map(
      scenario.organizations!.flatMap((organization) =>
        organization.divisions.map((division) => [
          division.name,
          organization.player,
        ]),
      ),
    );
    expect(divisionOwner.get("6th Division (Jérôme Bonaparte)")).toBe(1);
    expect(divisionOwner.get("1st Division (Quiot)")).toBe(2);
    expect(divisionOwner.get("19th Division (Simmer)")).toBe(3);
    expect(divisionOwner.get("11th Cavalry Division (l'Héritier)")).toBe(4);
    expect(divisionOwner.get("13th Cavalry Division (Wathier)")).toBe(5);
    expect(divisionOwner.get("Old Guard (Friant)")).toBe(6);
    expect(divisionOwner.get("2nd Netherlands Division (Perponcher)")).toBe(7);
    expect(divisionOwner.get("2nd Division (Clinton)")).toBe(8);
    expect(divisionOwner.get("5th Division (Picton)")).toBe(9);
    expect(divisionOwner.get("Household Brigade (Somerset)")).toBe(10);
  });

  it("names every command seat for lobby selection", () => {
    expect(
      scenario.players!.map(({ player, command }) => ({ player, command })),
    ).toEqual([
      { player: 1, command: { commander: "Reille", formation: "II Corps" } },
      { player: 2, command: { commander: "d'Erlon", formation: "I Corps" } },
      { player: 3, command: { commander: "Lobau", formation: "VI Corps" } },
      { player: 4, command: { commander: "Kellermann", formation: "III Cavalry Corps" } },
      { player: 5, command: { commander: "Milhaud", formation: "IV Cavalry Corps" } },
      { player: 6, command: { commander: "Napoleon", formation: "Imperial Guard & Reserve" } },
      { player: 7, command: { commander: "Prince of Orange", formation: "I Corps" } },
      { player: 8, command: { commander: "Hill", formation: "II Corps" } },
      { player: 9, command: { commander: "Wellington", formation: "Reserve" } },
      { player: 10, command: { commander: "Uxbridge", formation: "Cavalry" } },
      { player: 11, command: { commander: "Bülow", formation: "IV Corps" } },
      { player: 12, command: { commander: "Pirch", formation: "II Corps Detachment" } },
      { player: 13, command: { commander: "Zieten", formation: "I Corps Advance Guard" } },
    ]);
  });

  it("preserves each army's total ammunition while splitting command", () => {
    for (const team of [1, 2]) {
      const ammo = scenario
        .players!.filter((player) => player.team === team)
        .reduce((total, player) => total + (player.ammoReserve ?? 0), 0);
      expect(ammo).toBe(500000);
    }
  });

  it("opens turn 0 with one main and forward deployment zone per player", () => {
    expect(scenario.allowDeploymentPhase).toBe(true);

    const zones = scenario.map!.deploymentZones!.flatMap((team) => team.zones);
    for (const setup of scenario.players!) {
      expect(
        zones.filter(
          (zone) => zone.player === setup.player && zone.type === "main",
        ),
      ).toHaveLength(1);
      expect(
        zones.filter(
          (zone) => zone.player === setup.player && zone.type === "forward",
        ),
      ).toHaveLength(1);
    }
  });

  it("keeps every initially placed unit inside its commander's main zone", () => {
    const mainZones = new Map(
      scenario
        .map!.deploymentZones!.flatMap((team) => team.zones)
        .filter((zone) => zone.type === "main")
        .map((zone) => [zone.player, zone]),
    );

    for (const unit of scenario.units!) {
      const zone = mainZones.get(unit.player)!;
      expect(unit.pos.x).toBeGreaterThanOrEqual(zone.x);
      expect(unit.pos.x).toBeLessThanOrEqual(zone.x + zone.width);
      expect(unit.pos.y).toBeGreaterThanOrEqual(zone.y);
      expect(unit.pos.y).toBeLessThanOrEqual(zone.y + zone.height);
    }
  });

  it("stages each Prussian formation at the map edge before its battlefield action", () => {
    const schedule = scenario.triggers!.map((trigger) => ({
      at: clockOf(Number(trigger.conditions[0]!.value)),
      units: trigger.actions
        .filter((action) => action.type === "addUnit")
        .reduce((total, action) => total + action.value.length, 0),
    }));

    expect(schedule).toEqual([
      { at: "13:00", units: 0 },
      { at: "13:45", units: 12 },
      { at: "14:15", units: 18 },
      { at: "15:00", units: 13 },
      { at: "15:30", units: 14 },
      { at: "15:45", units: 13 },
      { at: "17:15", units: 15 },
    ]);
  });

  it("gives Bülow, Pirch and Zieten their own complete arriving commands", () => {
    expect(scenario.units!.some((unit) => unit.player >= 11)).toBe(false);

    expect(reinforcements.filter((unit) => unit.player === 11)).toHaveLength(57);
    expect(reinforcements.filter((unit) => unit.player === 12)).toHaveLength(13);
    expect(reinforcements.filter((unit) => unit.player === 13)).toHaveLength(15);

    const bulowNames = reinforcements
      .filter((unit) => unit.player === 11)
      .map((unit) => unit.name);
    expect(bulowNames).toEqual(
      expect.arrayContaining([
        "I/10th Infantry Regiment",
        "III/3rd Neumark Landwehr",
        "I/11th Infantry Regiment",
        "III/2nd Pomeranian Landwehr",
        "I/18th Infantry Regiment",
        "III/4th Silesian Landwehr",
        "I/15th Infantry Regiment",
        "III/2nd Silesian Landwehr",
        "6pdr Horse Battery No. 1",
        "7pdr Howitzer Battery No. 4",
      ]),
    );
    expect(bulowNames).not.toContain("1st Silesian Landwehr Cavalry");
    expect(bulowNames).not.toContain("2nd Pomeranian Landwehr Cavalry");

    const pirchNames = reinforcements
      .filter((unit) => unit.player === 12)
      .map((unit) => unit.name);
    expect(pirchNames).toEqual(
      expect.arrayContaining([
        "I/2nd Infantry Regiment",
        "F/25th Infantry Regiment",
        "III/5th Westphalian Landwehr",
        "Field Jäger Detachment",
        "6pdr Foot Battery No. 10",
      ]),
    );

    const zietenNames = reinforcements
      .filter((unit) => unit.player === 13)
      .map((unit) => unit.name);
    expect(zietenNames).toEqual(
      expect.arrayContaining([
        "I/12th Infantry Regiment",
        "F/24th Infantry Regiment",
        "III/1st Westphalian Landwehr",
        "Silesian Schützen (1st & 3rd Companies)",
        "4th (1st Silesian) Hussars",
        "3rd Brandenburg Uhlans",
        "5th Brandenburg Dragoons",
        "2nd Kurmark Landwehr Cavalry",
        "6pdr Horse Battery No. 7",
      ]),
    );
  });

  it("gives every arriving formation a unique name", () => {
    const names = reinforcements.map((unit) => unit.name);
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
