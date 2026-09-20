import { GameDataManager } from "@lob-sdk/game-data-manager";

/**
 * Austerlitz opens at 07:30, after Kienmayer has gone in at Telnitz and while
 * Soult is still hidden behind the Goldbach. The order of battle is Nafziger's
 * (805LCI and 805LCJ); a LoB unit is one infantry battalion, one battery, or
 * one cavalry double squadron, so the counts below are the historical ones.
 */
describe("Battle of Austerlitz scenario", () => {
  const gameDataManager = GameDataManager.get("napoleonic");
  const scenario = gameDataManager.getScenario("austerlitz");
  const templates = gameDataManager.getUnitTemplateManager();

  const FRENCH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const { MINUTES_PER_TURN } = gameDataManager.getGameConstants();
  const START_MINUTES = 7 * 60 + 30;
  const clockOf = (turn: number): string => {
    const minutes = START_MINUTES + (turn - 1) * MINUTES_PER_TURN;
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
  };

  const onMap = scenario.units!;
  const marchingOn = scenario.triggers!.flatMap((trigger) =>
    trigger.actions
      .filter((action) => action.type === "addUnit")
      .flatMap((action) => action.value),
  );
  /** The whole army: what stands on the field plus what marches on. */
  const units = [...onMap, ...marchingOn];
  const categoryOf = (type: number) => templates.getTemplate(type).category;
  const arm = (type: number) => {
    const category = categoryOf(type);
    if (category.endsWith("Cavalry")) return "cavalry";
    if (category.toLowerCase().includes("artillery")) return "artillery";
    return "infantry";
  };
  const countBy = (french: boolean, want: string) =>
    units.filter(
      (unit) =>
        FRENCH.includes(unit.player) === french && arm(unit.type) === want,
    ).length;

  it("opens at 07:30 on a 12.8 km square of Moravia", () => {
    expect(scenario.startTime).toBe("07:30");
    expect(scenario.map!.width).toBe(4096); // 256 tiles x 16 px
    expect(scenario.map!.height).toBe(4096);
    expect(scenario.allowDeploymentPhase).toBe(false);
    expect(clockOf(scenario.maxTurn!)).toBe("17:15");
  });

  it("fields both armies at their historical strength", () => {
    expect({
      battalions: countBy(true, "infantry"),
      doubleSquadrons: countBy(true, "cavalry"),
      batteries: countBy(true, "artillery"),
    }).toEqual({ battalions: 86, doubleSquadrons: 45, batteries: 19 });

    expect({
      battalions: countBy(false, "infantry"),
      doubleSquadrons: countBy(false, "cavalry"),
      batteries: countBy(false, "artillery"),
    }).toEqual({ battalions: 111, doubleSquadrons: 71, batteries: 40 });
  });

  it("gives each army ten occupied commands for Micro 10v10", () => {
    expect(scenario.players).toHaveLength(20);
    expect(scenario.players!.map((p) => p.player)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    expect(scenario.players!.filter((p) => p.team === 1)).toHaveLength(10);
    expect(scenario.players!.filter((p) => p.team === 2)).toHaveLength(10);
    for (const player of scenario.players!) {
      expect(units.filter((unit) => unit.player === player.player).length).toBeGreaterThan(0);
      expect(player.team).toBe(player.player <= 10 ? 1 : 2);
    }
    expect(gameDataManager.getScenarioMeta("austerlitz")).toMatchObject({
      playerCount: 20,
    });
  });

  it("names every unit, and names no two the same", () => {
    const names = units.map((unit) => unit.name);
    expect(names.filter((name) => !name)).toHaveLength(0);
    expect(new Set(names).size).toBe(names.length);
    expect(names.filter((name) => name!.length > 32)).toHaveLength(0);
  });

  it("does not place the same map label twice at one position", () => {
    const labels = scenario.map!.labels!;
    const placements = labels.map(
      ({ text, pos }) => `${text}:${pos.x}:${pos.y}`,
    );
    expect(new Set(placements).size).toBe(labels.length);
  });

  it("puts every unit in exactly one named brigade of its own player", () => {
    const owner = new Map(onMap.map((unit) => [unit.id, unit.player]));
    const claimed: number[] = [];
    for (const organization of scenario.organizations!)
      for (const division of organization.divisions)
        for (const brigade of division.brigades) {
          expect(brigade.name).toBeTruthy();
          for (const id of brigade.unitIds) {
            expect(owner.get(id)).toBe(organization.player);
            claimed.push(id);
          }
        }
    expect(claimed).toHaveLength(onMap.length);
    expect(new Set(claimed).size).toBe(onMap.length);
  });

  /**
   * The point of the battle: Soult's two assault divisions are massed *behind*
   * the Goldbach in the valley mist, not out on the open ground below the
   * Pratzen, and the plateau opposite is still Kollowrat's. An earlier draft
   * had them on the wrong bank, which no strength or elevation check caught.
   */
  it("keeps Soult west of the Goldbach and the 4th Column on the plateau", () => {
    const byId = new Map(onMap.map((unit) => [unit.id, unit]));
    const divisionUnits = (name: string) =>
      scenario
        .organizations!.flatMap((organization) => organization.divisions)
        .filter((division) => division.name === name)
        .flatMap((division) => division.brigades)
        .flatMap((brigade) => brigade.unitIds)
        .map((id) => byId.get(id)!);

    const assault = [
      ...divisionUnits("2nd Division (Vandamme)"),
      ...divisionUnits("1st Division (Saint-Hilaire)"),
    ];
    expect(assault).toHaveLength(20);
    // The stream meanders, so "behind the Goldbach" is not one x: for each
    // battalion there must be water between it and the plateau it will climb.
    const terrains = scenario.map!.terrains!;
    const water = new Set([4, 5]);
    const dry = assault.filter((unit) => {
      const x = Math.floor(unit.pos.x / 16);
      const y = Math.floor(unit.pos.y / 16);
      for (let step = x + 1; step <= Math.min(255, x + 20); step++)
        if (water.has(terrains[step]![y]!)) return false;
      return true;
    });
    expect(dry.map((unit) => unit.name)).toEqual([]);

    const plateau = [
      ...divisionUnits("Miloradovich's Division"),
      ...divisionUnits("Kollowrat's Division"),
    ];
    expect(Math.min(...plateau.map((unit) => unit.pos.x))).toBeGreaterThan(1900);
  });

  /**
   * Davout marched through the night from Gross-Raigern and his head only
   * reached Sokolnitz about 08:30. Standing all of III Corps on the field at
   * 07:30 would hand Legrand the help he did not have: the southern flank
   * turns on his holding the Goldbach villages alone until Friant comes up.
   */
  it("marches Davout on at the hour he arrived, not before", () => {
    const schedule = scenario.triggers!.map((trigger) => ({
      at: clockOf(Number(trigger.conditions[0]!.value)),
      units: trigger.actions
        .filter((action) => action.type === "addUnit")
        .reduce((total, action) => total + action.value.length, 0),
    }));
    expect(schedule).toEqual([
      { at: "8:30", units: 7 }, // Kister and Lochet, on the Telnitz lane
      { at: "9:15", units: 8 }, // Bourcier's dragoons behind them
    ]);
    expect(marchingOn.every((unit) => unit.player === 6)).toBe(true);

    // only Heudelet's leading brigade and the corps guns start on the field
    const present = onMap.filter((unit) => unit.player === 6);
    expect(present.map((unit) => unit.name).sort()).toEqual([
      "1/108e de Ligne",
      "1re Cie, 5e a Cheval",
      "1re Cie, 7e a Pied",
      "2/108e de Ligne",
    ]);
    // and they come in from the west edge, not from inside the French line
    expect(
      Math.max(...[...present, ...marchingOn].map((unit) => unit.pos.x)),
    ).toBeLessThan(1000);
  });

  /**
   * Soult's assault divisions are in colonnes d'attaque behind the Goldbach,
   * Lannes and Bagration are deployed in line astride the Olmutz road, the
   * allied attack columns are marching in column, and the reserves are closed
   * up in column. Guards and militia are foot and must honour that too — they
   * are their own unit categories, and treating "infantry" as the only foot
   * category once stood the whole Imperial Guard in line by accident.
   */
  it("forms each division the way it stood that morning", () => {
    const allowed = (type: number) =>
      new Set(templates.getTemplate(type).formations.map((f) => f.id));
    expect(
      units.filter((unit) => !allowed(unit.type).has(unit.f!)),
    ).toHaveLength(0);

    const byId = new Map(onMap.map((unit) => [unit.id, unit]));
    const formationOf = (division: string) => [
      ...new Set(
        scenario
          .organizations!.flatMap((organization) => organization.divisions)
          .filter((d) => d.name === division)
          .flatMap((d) => d.brigades)
          .flatMap((brigade) => brigade.unitIds)
          .map((id) => byId.get(id)!.f),
      ),
    ];

    for (const division of [
      "2nd Division (Vandamme)",
      "1st Division (Saint-Hilaire)",
      "Imperial Guard Infantry",
      "Grenadier Division (Oudinot)",
      "1st Column (Dokhturov)",
      "3rd Column (Przybyszewski)",
    ])
      expect([division, formationOf(division)]).toEqual([division, ["column"]]);

    for (const division of [
      "1st Division (Suchet)",
      "3rd Division (Legrand)",
      "Miloradovich's Division",
      "Guard Infantry (Kollowrizov)",
    ])
      expect([division, formationOf(division)]).toEqual([division, ["line"]]);
  });

  /**
   * An objective with no owner starts NEUTRAL, which would hand the Pratzen
   * and the Goldbach villages to whoever walked onto them first. Each one is
   * held at 07:30 by the command that actually held it — the engine derives
   * `team` from `player`, so naming the corps is enough and says more.
   */
  it("starts each objective under the command that held it", () => {
    const teamOf = new Map(
      scenario.players!.map((player) => [player.player, player.team]),
    );
    const held = Object.fromEntries(
      scenario.objectives!.map((objective) => [objective.name, objective.player]),
    );
    expect(held).toEqual({
      "Santon battery": 1, // Lannes fortified it
      Bosenitz: 1,
      Kobelnitz: 5, // Legrand's cordon down the Goldbach
      "Sokolnitz castle": 5,
      Sokolnitz: 5,
      Telnitz: 5, // Kienmayer is attacking it, not holding it
      Blaziowitz: 18, // the Russian Guard Jager battalion is in it
      "Stare Vinohrady": 15,
      Pratzen: 15,
      Pratzeberg: 15, // the 4th Column, and the monarchs with it
      Augezd: 12,
      "Satschan causeway": 12,
    });
    const sides = scenario.objectives!.map((o) => teamOf.get(o.player!));
    expect(sides.filter((team) => team === 1)).toHaveLength(6);
    expect(sides.filter((team) => team === 2)).toHaveLength(6);
  });

  it("stands nobody in the ponds or the stream", () => {
    const terrains = scenario.map!.terrains!;
    const impassable = new Set([5, 12]); // deepWater, city
    const standing = units.map((unit) => {
      const x = Math.min(255, Math.max(0, Math.floor(unit.pos.x / 16)));
      const y = Math.min(255, Math.max(0, Math.floor(unit.pos.y / 16)));
      return terrains[x]![y]!;
    });
    expect(standing.filter((tile) => impassable.has(tile))).toHaveLength(0);
  });
});
