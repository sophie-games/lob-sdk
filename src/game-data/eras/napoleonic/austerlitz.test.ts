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

  const FRENCH = [1, 2, 3, 4, 5, 6];
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

  it("groups the armies into six French and eight allied field commands", () => {
    expect(scenario.players).toHaveLength(14);
    expect(scenario.players!.map((p) => p.player)).toEqual(
      Array.from({ length: 14 }, (_, i) => i + 1),
    );
    expect(scenario.players!.filter((p) => p.team === 1)).toHaveLength(6);
    expect(scenario.players!.filter((p) => p.team === 2)).toHaveLength(8);
    expect(scenario.players).toMatchObject([
      { name: "V Corps (Lannes)" },
      { name: "I Corps (Bernadotte)" },
      { name: "IV Corps (Soult)" },
      { name: "III Corps (Davout)" },
      { name: "Cavalry Reserve (Murat)" },
      { name: "Imperial Reserve (Napoleon)" },
      { name: "Advance Guard (Kienmayer)" },
      { name: "1st Column (Dokhturov)" },
      { name: "2nd Column (Langeron)" },
      { name: "3rd Column (Przybyszewski)" },
      { name: "4th Column (Kollowrat and Miloradovich)" },
      { name: "5th Column (Liechtenstein)" },
      { name: "Advance Guard (Bagration)" },
      { name: "Russian Guard (Constantine)" },
    ]);
    for (const player of scenario.players!) {
      expect(units.filter((unit) => unit.player === player.player).length).toBeGreaterThan(0);
      expect(player.team).toBe(player.player <= 6 ? 1 : 2);
    }
    expect(scenario.objectives!.every(({ player }) =>
      scenario.players!.some((command) => command.player === player),
    )).toBe(true);
    const divisionsOf = (player: number) =>
      scenario.organizations!.find((organization) => organization.player === player)!
        .divisions.map((division) => division.name);
    expect(divisionsOf(3)).toEqual(expect.arrayContaining([
      "3rd Division (Legrand)",
      "2nd Division (Vandamme)",
      "1st Division (Saint-Hilaire)",
    ]));
    expect(divisionsOf(5)).toEqual(expect.arrayContaining([
      "Light Cavalry Division (Kellermann)",
      "1st Heavy Division (Nansouty)",
      "3rd Dragoon Division (Beaumont)",
    ]));
    expect(divisionsOf(6)).toEqual(expect.arrayContaining([
      "Imperial Guard Infantry",
      "Grenadier Division (Oudinot)",
    ]));
    expect(divisionsOf(11)).toEqual(expect.arrayContaining([
      "Miloradovich's Division",
      "Kollowrat's Division",
    ]));
    expect(gameDataManager.getScenarioMeta("austerlitz")).toMatchObject({
      playerCount: 14,
    });
  });

  it("names every unit, and names no two the same", () => {
    const names = units.map((unit) => unit.name);
    expect(names.filter((name) => !name)).toHaveLength(0);
    expect(new Set(names).size).toBe(names.length);
    expect(names.filter((name) => name!.length > 32)).toHaveLength(0);
  });

  it("arms the Don Cossack regiments as lancers, not horse archers", () => {
    // The allied order of battle names Isayev, Kiselev and Khanzhenkov as
    // Don Cossack regiments; the 1805 Cossack study identifies the pike as
    // their characteristic weapon, not the bow.
    // https://www.austerlitz.org/cz/ruska-armada-1805-iii-armada-ruskeho-cara-od-a-do-z-kozaci/
    const cossacks = onMap.filter((unit) => unit.name?.includes("Cossacks"));
    expect(cossacks.map((unit) => unit.name)).toEqual([
      "I/Isayev Cossacks",
      "II/Isayev Cossacks",
      "I/Kiselev Cossacks",
      "II/Kiselev Cossacks",
      "I/Khanzhenkov Cossacks",
      "II/Khanzhenkov Cossacks",
    ]);
    expect(cossacks.map((unit) => unit.type)).toEqual(Array(6).fill(5));
  });

  it("does not place the same map label twice at one position", () => {
    const labels = scenario.map!.labels!;
    const placements = labels.map(
      ({ text, pos }) => `${text}:${pos.x}:${pos.y}`,
    );
    expect(new Set(placements).size).toBe(labels.length);
  });

  it("does not repeat a place name at an objective or elsewhere on the map", () => {
    const labels = scenario.map!.labels!;
    expect(new Set(labels.map(({ text }) => text.toLocaleLowerCase())).size).toBe(labels.length);
    for (const label of labels) {
      const matchingObjective = scenario.objectives!.find((objective) =>
        objective.name!.toLocaleLowerCase() === label.text.toLocaleLowerCase() ||
        objective.name!.toLocaleLowerCase().startsWith(`${label.text.toLocaleLowerCase()} `),
      );
      if (matchingObjective) {
        const dx = label.pos.x - matchingObjective.pos.x;
        const dy = label.pos.y - matchingObjective.pos.y;
        expect(Math.hypot(dx, dy)).toBeGreaterThan(32);
      }
    }
  });

  it("starts with equal, usable victory points for both armies", () => {
    const teamByPlayer = new Map(scenario.players!.map(({ player, team }) => [player, team]));
    const totals = new Map<number, number>();
    for (const objective of scenario.objectives!) {
      const team = teamByPlayer.get(objective.player!)!;
      totals.set(team, (totals.get(team) ?? 0) + objective.vp!);
      const { x, y } = objective.pos;
      expect([5, 6, 12]).not.toContain(scenario.map!.terrains![Math.floor(x / 16)]![Math.floor(y / 16)]);
    }
    expect([...totals.entries()].sort(([a], [b]) => a - b)).toEqual([[1, 600], [2, 600]]);
  });

  it("gives every bridge site a road approach from two different banks", () => {
    const terrain = scenario.map!.terrains!;
    const bridges = new Set<string>();
    const tile = (x: number, y: number) => `${x},${y}`;
    const parse = (point: string) => point.split(",").map(Number) as [number, number];
    for (let x = 0; x < terrain.length; x++)
      for (let y = 0; y < terrain[x]!.length; y++)
        if (terrain[x]![y] === 7) bridges.add(tile(x, y));

    const directions = [[-1, 0, "west"], [1, 0, "east"], [0, -1, "north"], [0, 1, "south"]] as const;
    const groups: Array<Set<string>> = [];
    while (bridges.size) {
      const group = new Set<string>();
      const queue = [bridges.values().next().value!];
      bridges.delete(queue[0]!);
      for (const point of queue) {
        group.add(point);
        const [x, y] = parse(point);
        for (const [dx, dy] of directions) {
          const neighbor = tile(x + dx, y + dy);
          if (bridges.delete(neighbor)) queue.push(neighbor);
        }
      }
      groups.push(group);
    }
    expect(groups).toHaveLength(11);
    expect(groups.find((group) => group.has(tile(81, 114)))?.size).toBe(7);
    for (const group of groups) {
      const banks = new Set<string>();
      for (const point of group) {
        const [x, y] = parse(point);
        for (const [dx, dy, bank] of directions)
          if (terrain[x + dx]?.[y + dy] === 3) banks.add(bank);
      }
      expect(banks.size).toBeGreaterThanOrEqual(2);
    }
    for (let x = 1; x < terrain.length - 1; x++)
      for (let y = 1; y < terrain[x]!.length - 1; y++)
        if ([4, 5].includes(terrain[x]![y]!))
          expect(directions.filter(([dx, dy]) => terrain[x + dx]?.[y + dy] === 7).length)
            .toBeLessThan(3);
  });

  it("uses road terrain rather than dirt for its route network", () => {
    const terrain = scenario.map!.terrains!.flat();
    expect(terrain.filter((tile) => tile === 9)).toHaveLength(0);
    expect(terrain.filter((tile) => tile === 3).length).toBeGreaterThan(0);
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
    expect(marchingOn.every((unit) => unit.player === 4)).toBe(true);

    // only Heudelet's leading brigade and the corps guns start on the field
    const present = onMap.filter((unit) => unit.player === 4);
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

  it("gives Davout's successive reinforcements distinct entry positions", () => {
    // An earlier wave can still be at the entry edge when the next one arrives.
    // addUnit uses authored coordinates without moving occupants out of the way.
    const entryPositions = scenario.triggers!.flatMap((trigger) =>
      trigger.actions
        .filter((action) => action.type === "addUnit")
        .flatMap((action) => action.value)
        .map((unit) => `${unit.pos.x}:${unit.pos.y}`),
    );
    expect(new Set(entryPositions).size).toBe(entryPositions.length);
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
      Kobelnitz: 3, // Legrand's cordon within Soult's IV Corps
      "Sokolnitz castle": 3,
      Sokolnitz: 3,
      Telnitz: 3, // Kienmayer is attacking it, not holding it
      Blaziowitz: 14, // the Russian Guard Jager battalion is in it
      "Stare Vinohrady": 11,
      Pratzen: 11,
      Pratzeberg: 11, // the 4th Column, and the monarchs with it
      Augezd: 8,
      "Satschan causeway": 8,
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
