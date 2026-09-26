import { GameDataManager } from "@lob-sdk/game-data-manager";
import {
  getDeploymentZoneArea,
  getDeploymentZoneBounds,
  isInsideDeploymentZone,
  isValidDeploymentPolygon,
} from "../../../utils/deployment-zone";
import polygonClipping from "polygon-clipping";
import type { Polygon } from "polygon-clipping";
import { ScenarioFeatures } from "../../../scenario/scenario-features";
import { ObjectiveType } from "../../../types/objective";
import { TerrainType } from "../../../types/terrain";
import { getCollisionConfig, isCircleCollision } from "../../../types/collision-config";

/**
 * The fixed 11:30 deployment gives every command its own sector of its army's
 * ground. Passing turn 0 keeps the placement; moving units stays behind the line.
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
    expect(
      scenario.players!.filter((player) => player.team === 1),
    ).toHaveLength(6);
    expect(
      scenario.players!.filter((player) => player.team === 2),
    ).toHaveLength(7);

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
    expect(divisionOwner.get("3rd Netherlands Division (Chassé)")).toBe(7);
    expect(divisionOwner.get("Nassau Contingent (Kruse)")).toBe(9);
    expect(divisionOwner.get("2nd Division (Clinton)")).toBe(8);
    expect(divisionOwner.get("5th Division (Picton)")).toBe(9);
    expect(divisionOwner.get("3rd Cavalry Division (Domon)")).toBe(3);
    expect(divisionOwner.get("5th Cavalry Division (Subervie)")).toBe(3);
    expect(divisionOwner.get("Household Brigade (Somerset)")).toBe(10);
  });

  it("names every command seat for lobby selection", () => {
    expect(
      scenario.players!.map(({ player, command }) => ({ player, command })),
    ).toEqual([
      { player: 1, command: { commander: "Reille", formation: "II Corps" } },
      { player: 2, command: { commander: "d'Erlon", formation: "I Corps" } },
      { player: 3, command: { commander: "Lobau", formation: "VI Corps" } },
      {
        player: 4,
        command: { commander: "Kellermann", formation: "III Cavalry Corps" },
      },
      {
        player: 5,
        command: { commander: "Milhaud", formation: "IV Cavalry Corps" },
      },
      {
        player: 6,
        command: {
          commander: "Napoleon",
          formation: "Imperial Guard & Reserve",
        },
      },
      {
        player: 7,
        command: { commander: "Prince of Orange", formation: "I Corps" },
      },
      { player: 8, command: { commander: "Hill", formation: "II Corps" } },
      { player: 9, command: { commander: "Wellington", formation: "Reserve" } },
      { player: 10, command: { commander: "Uxbridge", formation: "Cavalry" } },
      { player: 11, command: { commander: "Bülow", formation: "IV Corps" } },
      {
        player: 12,
        command: { commander: "Pirch", formation: "II Corps Detachment" },
      },
      {
        player: 13,
        command: { commander: "Zieten", formation: "I Corps Advance Guard" },
      },
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

  it("opens turn 0 with one sector of ground per command", () => {
    expect(ScenarioFeatures.hasDeploymentPhase(scenario)).toBe(true);
    expect(scenario.assignableDeploymentZones).toBe(false);

    const zones = scenario.map!.deploymentZones!.flatMap((team) => team.zones);
    for (const { player } of scenario.players!) {
      // Prussian seats have no troops at 11:30, so they get no ground.
      expect(
        zones.filter((zone) => zone.player === player && zone.type === "main"),
      ).toHaveLength(player <= 10 ? 1 : 0);
    }
    for (const zone of zones) {
      expect(zone.player).toBeDefined();
    }
  });

  it("scores the ground each army fought for", () => {
    expect(
      scenario.objectives!.map(({ name, player, type }) => ({ name, player, type })),
    ).toEqual(
      expect.arrayContaining([
        // Each army's big objective is its rear: Wellington's road to Brussels
        // at Mont-Saint-Jean, Napoleon's command post and road home at Rossomme.
        { name: "Mont-Saint-Jean", player: 9, type: ObjectiveType.Big },
        { name: "La Belle Alliance", player: 6, type: undefined },
        { name: "Hougoumont", player: 7, type: undefined },
        { name: "La Haye Sainte", player: 7, type: undefined },
        { name: "Papelotte", player: 7, type: undefined },
        // Where Zieten joined Wellington's left.
        { name: "Smohain", player: 7, type: undefined },
        { name: "Plancenoit", player: 3, type: undefined },
        { name: "Rossomme", player: 6, type: ObjectiveType.Big },
      ]),
    );
    expect(scenario.objectives).toHaveLength(8);
  });

  it("never steps more than one height level between neighbouring tiles", () => {
    const heights = scenario.map!.heightMap;
    const steep = heights.flatMap((column, x) =>
      column.flatMap((height, y) =>
        [-1, 0, 1].flatMap((dx) =>
          [-1, 0, 1]
            .map((dy) => heights[x + dx]?.[y + dy])
            .filter((other) => other !== undefined && Math.abs(other - height) > 1)
            .map(() => ({ x, y })),
        ),
      ),
    );
    expect(steep).toEqual([]);
  });

  it("leaves objective names to the objectives", () => {
    const names = new Set(scenario.objectives!.map(({ name }) => name));
    // Nor a label on the objective, or in the band below it where its name is drawn.
    const onObjective = ({ pos }: { pos: { x: number; y: number } }) =>
      scenario.objectives!.some(
        (objective) =>
          Math.hypot(objective.pos.x - pos.x, objective.pos.y - pos.y) < 48 ||
          (Math.abs(objective.pos.x - pos.x) < 150 &&
            pos.y - objective.pos.y >= 0 &&
            pos.y - objective.pos.y < 130),
      );
    expect(
      scenario.map!.labels!.filter(
        (label) => names.has(label.text) || onObjective(label),
      ),
    ).toEqual([]);
  });

  it("draws the field at the era's scale", () => {
    const { METERS_PER_PIXEL } = gameDataManager.getGameConstants();
    const at = (name: string) =>
      scenario.objectives!.find((objective) => objective.name === name)!.pos;
    const metres = (a: string, b: string) =>
      Math.hypot(at(a).x - at(b).x, at(a).y - at(b).y) * METERS_PER_PIXEL!;
    // Surveyed distances between the farm buildings.
    for (const [a, b, real] of [
      ["Hougoumont", "Papelotte", 2986],
      ["La Haye Sainte", "La Belle Alliance", 1071],
      ["Mont-Saint-Jean", "La Belle Alliance", 2372],
      ["Hougoumont", "La Haye Sainte", 1453],
    ] as const) {
      expect(Math.abs(metres(a, b) - real) / real).toBeLessThan(0.05);
    }
  });

  it("keeps every initially placed unit on its own command's ground", () => {
    for (const unit of scenario.units!) {
      const zones = scenario.map!.deploymentZones!
        .flatMap((team) => team.zones)
        .filter((zone) => zone.player === unit.player);
      const canDeployForward =
        gameDataManager.getUnitTemplateManager().getTemplate(unit.type)
          .canDeployForward ?? false;
      const valid = zones.some(
        (zone) =>
          (zone.type === "main" || canDeployForward) &&
          isInsideDeploymentZone(zone, unit.pos),
      );
      if (!valid)
        throw new Error(`Unit ${unit.id} is outside its deployment ground`);
    }
  });

  it("uses valid nonempty ground of at most sixteen points per polygon", () => {
    for (const { zones } of scenario.map!.deploymentZones!) {
      for (const zone of zones) {
        expect(getDeploymentZoneArea(zone)).toBeGreaterThan(0);
        expect(zone.polygons.every(isValidDeploymentPolygon)).toBe(true);
        for (const { outer, holes } of zone.polygons) {
          expect(outer.length).toBeLessThanOrEqual(16);
          expect(holes ?? []).toEqual([]);
        }
      }
    }
  });

  it("gives every deployment polygon one exclusive owner", () => {
    const zones = scenario.map!.deploymentZones!.flatMap((team) => team.zones);
    const polygon = (zone: (typeof zones)[number]): Polygon[] =>
      zone.polygons.map(({ outer, holes }) => [
        outer.map(({ x, y }) => [x, y] as [number, number]),
        ...(holes ?? []).map((ring) =>
          ring.map(({ x, y }) => [x, y] as [number, number]),
        ),
      ]);
    const ground = (zone: (typeof zones)[number]) => {
      const [first, ...rest] = polygon(zone);
      return polygonClipping.union(first!, ...rest);
    };

    for (let i = 0; i < zones.length; i++) {
      const first = zones[i]!;
      const a = getDeploymentZoneBounds(first);
      for (const second of zones.slice(i + 1)) {
        const b = getDeploymentZoneBounds(second);
        if (
          a.right <= b.left ||
          b.right <= a.left ||
          a.bottom <= b.top ||
          b.bottom <= a.top
        )
          continue;
        expect(
          polygonClipping.intersection(
            ground(first),
            ground(second),
          ),
        ).toEqual([]);
      }
    }
  });

  it("keeps ground behind each army's most advanced initial position", () => {
    const zones = scenario.map!.deploymentZones!.flatMap((team) => team.zones);
    const frenchFront = Math.min(
      ...scenario.units!.filter((unit) => unit.player <= 6).map((unit) => unit.pos.y),
    );
    const alliedFront = Math.max(
      ...scenario.units!.filter((unit) => unit.player >= 7).map((unit) => unit.pos.y),
    );
    for (const zone of zones) {
      for (const { outer } of zone.polygons) {
        for (const point of outer) {
          expect(
            zone.team === 1
              ? point.y >= frenchFront - 0.000001
              : point.y <= alliedFront + 0.000001,
          ).toBe(true);
        }
      }
    }
  });

  it("keeps opposing deployment ground at least three tiles apart", () => {
    const [french, allied] = scenario.map!.deploymentZones!;
    const polygons = (zones: typeof french.zones): Polygon[] =>
      zones.flatMap((zone) =>
        zone.polygons.map(({ outer, holes }) => [
          outer.map(({ x, y }) => [x, y] as [number, number]),
          ...(holes ?? []).map((ring) =>
            ring.map(({ x, y }) => [x, y] as [number, number]),
          ),
        ]),
      );

    const ground = (zones: typeof french.zones) => {
      const [first, ...rest] = polygons(zones);
      return polygonClipping.union(first!, ...rest);
    };
    const frenchGround = ground(french.zones);
    const alliedGround = ground(allied.zones);
    expect(polygonClipping.intersection(frenchGround, alliedGround)).toEqual(
      [],
    );

    type Point = { x: number; y: number };
    const edges = (zones: typeof french.zones): [Point, Point][] =>
      zones.flatMap((zone) =>
        zone.polygons.flatMap(({ outer, holes }) =>
          [outer, ...(holes ?? [])].flatMap((ring) =>
            ring.map(
              (point, index) =>
                [point, ring[(index + 1) % ring.length]!] as [Point, Point],
            ),
          ),
        ),
      );
    const pointToEdgeSquared = (point: Point, start: Point, end: Point) => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;
      const t = lengthSquared
        ? Math.max(
            0,
            Math.min(
              1,
              ((point.x - start.x) * dx + (point.y - start.y) * dy) /
                lengthSquared,
            ),
          )
        : 0;
      return (
        (point.x - start.x - t * dx) ** 2 + (point.y - start.y - t * dy) ** 2
      );
    };
    let nearestSquared = Infinity;
    for (const [a, b] of edges(french.zones)) {
      for (const [c, d] of edges(allied.zones)) {
        nearestSquared = Math.min(
          nearestSquared,
          pointToEdgeSquared(a, c, d),
          pointToEdgeSquared(b, c, d),
          pointToEdgeSquared(c, a, b),
          pointToEdgeSquared(d, a, b),
        );
      }
    }
    expect(Math.sqrt(nearestSquared)).toBeGreaterThanOrEqual(48);
  });

  it("reserves the three Allied farm objectives for forward-capable troops", () => {
    const [french, allied] = scenario.map!.deploymentZones!;
    for (const name of ["Hougoumont", "La Haye Sainte", "Papelotte"]) {
      const objective = scenario.objectives!.find(
        (item) => item.name === name,
      )!;
      expect(
        french.zones.some((zone) =>
          isInsideDeploymentZone(zone, objective.pos),
        ),
      ).toBe(false);
      expect(
        allied.zones.some(
          (zone) =>
            zone.type === "main" && isInsideDeploymentZone(zone, objective.pos),
        ),
      ).toBe(false);
      expect(
        allied.zones.filter((zone) =>
          isInsideDeploymentZone(zone, objective.pos),
        ).map(({ type }) => type),
      ).toEqual(["forward"]);
    }
  });

  it("posts Hougoumont's garrison wholly in the chateau, garden walls and wood", () => {
    const cover = [TerrainType.Building, TerrainType.Wall, TerrainType.Forest];
    const hougoumont = scenario.objectives!.find(
      (item) => item.name === "Hougoumont",
    )!.pos;
    const garrison = scenario.units!.filter(
      (unit) =>
        unit.player >= 7 &&
        Math.hypot(unit.pos.x - hougoumont.x, unit.pos.y - hougoumont.y) <= 130,
    );
    expect(garrison.length).toBeGreaterThan(0);
    for (const unit of garrison) {
      const template = gameDataManager.getUnitTemplateManager().getTemplate(unit.type);
      const shape = getCollisionConfig(
        gameDataManager.getFormationManager().getTemplate(template.defaultFormation)!,
      );
      if (isCircleCollision(shape)) throw new Error(`Unit ${unit.id} has no footprint`);
      const [cos, sin] = [Math.cos(unit.rotation), Math.sin(unit.rotation)];
      for (const [depth, side] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        const d = (depth! * shape.depth) / 2 - depth!;
        const s = (side! * shape.frontage) / 2 - side!;
        const x = unit.pos.x + d * cos - s * sin;
        const y = unit.pos.y + d * sin + s * cos;
        const terrain = scenario.map!.terrains[Math.floor(x / 16)]![Math.floor(y / 16)]!;
        if (!cover.includes(terrain))
          throw new Error(`Unit ${unit.id} stands partly on terrain ${terrain}`);
      }
    }
  });

  it("garrisons Hougoumont with the troops that held it at 11:30", () => {
    const brigadeOf = new Map(
      scenario.organizations!.flatMap((organization) =>
        organization.divisions.flatMap((division) =>
          division.brigades.flatMap((brigade) =>
            brigade.unitIds.map((id) => [id, brigade.name] as const),
          ),
        ),
      ),
    );
    const hougoumont = scenario.objectives!.find(
      (item) => item.name === "Hougoumont",
    )!.pos;
    const holders = new Set(
      scenario.units!
        .filter(
          (unit) =>
            unit.player >= 7 &&
            Math.hypot(unit.pos.x - hougoumont.x, unit.pos.y - hougoumont.y) <= 130,
        )
        .map((unit) => brigadeOf.get(unit.id!)),
    );
    // Macdonell's and Saltoun's Guards light companies, I/2nd Nassau and Kielmansegge's jägers.
    expect([...holders].sort()).toEqual([
      "1st Guards Brigade (Maitland)",
      "1st Hanoverian Brigade (Kielmansegge)",
      "2nd Brigade (Saxe-Weimar)",
      "2nd Guards Brigade (Byng)",
    ]);
  });

  // After Nafziger and Siborne: every allied battalion and regiment sits in its own brigade, under its
  // own name, a unit to each 600 men or 240 sabres.
  it("follows the Anglo-allied order of battle, brigade by brigade", () => {
    const expected: Record<string, string[]> = {
      "1st Guards Brigade (Maitland)": [
        "2/1st Foot Guards",
        "3/1st Foot Guards (Left Wing)",
        "3/1st Foot Guards (Right Wing)",
        "Light Coy, 2/1st Foot Guards",
        "Light Coy, 3/1st Foot Guards",
      ],
      "2nd Guards Brigade (Byng)": [
        "2/3rd Foot Guards (Left Wing)",
        "2/3rd Foot Guards (Right Wing)",
        "2/Coldstream Guards",
        "Light Coy, 2/3rd Foot Guards",
        "Light Coy, 2/Coldstream Guards",
      ],
      "5th British Brigade (Halkett)": [
        "2/30th (Cambridgeshire)",
        "2/69th (South Lincolnshire)",
        "2/73rd (Highland)",
        "33rd (1st West Riding)",
      ],
      "2nd KGL Brigade (Ompteda)": [
        "1st Coy, 1st Light Battalion KGL",
        "1st Coy, 2nd Light Battalion KGL",
        "2nd Coy, 1st Light Battalion KGL",
        "2nd Coy, 2nd Light Battalion KGL",
        "5th Line Battalion KGL",
        "8th Line Battalion KGL",
      ],
      "1st Hanoverian Brigade (Kielmansegge)": [
        "1st Coy, Field Jager Corps",
        "2nd Coy, Field Jager Corps",
        "Field Battalion Bremen",
        "Field Battalion Verden",
        "Field Battalion York (Osnabruck)",
        "Light Battalion Grubenhagen",
        "Light Battalion Luneburg",
      ],
      "1st Brigade (Bijlandt)": [
        "27th Jager Battalion",
        "5th Militia Battalion",
        "7th Line Battalion",
        "7th Militia Battalion",
        "8th Militia Battalion",
      ],
      "2nd Brigade (Saxe-Weimar)": [
        "1/28th Oranje-Nassau",
        "1st Coy, 1/2nd Nassau",
        "1st Coy, 3/2nd Nassau",
        "2/28th Oranje-Nassau",
        "2/2nd Nassau (Left Wing)",
        "2/2nd Nassau (Right Wing)",
        "2nd Coy, 1/2nd Nassau",
        "2nd Coy, 3/2nd Nassau",
        "3rd Coy, 1/2nd Nassau",
        "3rd Coy, 3/2nd Nassau",
        "4th Coy, 3/2nd Nassau",
        "5th Coy, 3/2nd Nassau",
        "6th Coy, 3/2nd Nassau",
        "Grenadier Coy, 1/2nd Nassau",
        "Volunteer Jagers, Oranje-Nassau",
      ],
      "3rd British Brigade (Adam)": [
        "1/52nd (Oxfordshire) Left Wing",
        "1/52nd (Oxfordshire) Right Wing",
        "1/71st (Highland Light Infantry)",
        "1st Coy, 2/95th Rifles",
        "1st Coy, 3/95th Rifles",
        "2nd Coy, 2/95th Rifles",
        "2nd Coy, 3/95th Rifles",
      ],
      "1st KGL Brigade (du Plat)": [
        "1st Line Battalion KGL",
        "2nd Line Battalion KGL",
        "3rd & 4th Line Battalions KGL",
      ],
      "3rd Hanoverian Brigade (Halkett)": [
        "Landwehr Battalion Bremervorde",
        "Landwehr Battalion Osnabruck",
        "Landwehr Battalion Quackenbruck",
        "Landwehr Battalion Salzgitter",
      ],
      "4th British Brigade (Mitchell)": [
        "1/23rd (Royal Welch Fusiliers)",
        "3/14th (Buckinghamshire)",
        "51st (2nd West Riding)",
      ],
      "8th Brigade (Kempt)": [
        "1/28th (North Gloucestershire)",
        "1/32nd (Cornwall)",
        "1/79th (Cameron Highlanders)",
        "1st Coy, 1/95th Rifles",
        "2nd Coy, 1/95th Rifles",
      ],
      "9th Brigade (Pack)": [
        "1/42nd (Royal Highland)",
        "1/92nd (Gordon Highlanders)",
        "2/44th (East Essex)",
        "3/1st (Royal Scots)",
      ],
      "5th Hanoverian Brigade (Vincke)": [
        "Landwehr Battalion Gifhorn",
        "Landwehr Battalion Hameln",
        "Landwehr Battalion Hildesheim",
        "Landwehr Battalion Peine",
        "Sharpshooters, 5th Hanoverian Brigade",
      ],
      "10th Brigade (Lambert)": [
        "1/27th (Inniskilling)",
        "1/40th (2nd Somersetshire)",
        "1/4th (King's Own)",
      ],
      "4th Hanoverian Brigade (Best)": [
        "Landwehr Battalion Luneburg",
        "Landwehr Battalion Munden",
        "Landwehr Battalion Osterode",
        "Landwehr Battalion Verden",
        "Sharpshooters (Left), 4th Hanoverian Brigade",
        "Sharpshooters (Right), 4th Hanoverian Brigade",
      ],
      "1st Brigade (Detmers)": [
        "17th & 19th Militia Battalions",
        "2nd Line Battalion",
        "35th Jager Battalion",
        "4th Militia Battalion",
        "6th Militia Battalion",
      ],
      "2nd Brigade (d'Aubremé)": [
        "10th Militia Battalion",
        "12th Line Battalion",
        "13th Line Battalion",
        "36th Jager Battalion",
        "3rd Line Battalion",
        "3rd Militia Battalion",
      ],
      "Advance Guard (Rauschenplatt)": [
        "Brunswick Avant-Garde Battalion",
        "Brunswick Uhlan Squadron",
      ],
      "1st Brigade (Buttlar)": [
        "Brunswick 1st Light Battalion",
        "Brunswick 2nd Light Battalion",
        "Brunswick 3rd Light Battalion",
        "Brunswick Leib-Battalion",
      ],
      "2nd Brigade (Specht)": [
        "Brunswick 1st Line Battalion",
        "Brunswick 2nd Line Battalion",
        "Brunswick 3rd Line Battalion",
      ],
      "2nd Hussars (Cramm)": [
        "Brunswick 2nd Hussars (Centre)",
        "Brunswick 2nd Hussars (Left)",
        "Brunswick 2nd Hussars (Right)",
      ],
      "1st Nassau Regiment": [
        "1/1st Nassau (Left Wing)",
        "1/1st Nassau (Right Wing)",
        "2/1st Nassau (Left Wing)",
        "2/1st Nassau (Right Wing)",
        "3/1st Nassau",
      ],
      "Life Guards, Blues & King's Dragoon Guards": [
        "1st King's Dragoon Guards (Left)",
        "1st King's Dragoon Guards (Right)",
        "1st Life Guards",
        "2nd Life Guards",
        "Royal Horse Guards (Blues)",
      ],
      "Royals, Scots Greys & Inniskillings": [
        "1st Royal Dragoons (Left)",
        "1st Royal Dragoons (Right)",
        "2nd Scots Greys (Left)",
        "2nd Scots Greys (Right)",
        "6th Inniskilling Dragoons (Left)",
        "6th Inniskilling Dragoons (Right)",
      ],
      "11th, 12th & 16th Light Dragoons": [
        "11th Light Dragoons (Left)",
        "11th Light Dragoons (Right)",
        "12th Light Dragoons (Left)",
        "12th Light Dragoons (Right)",
        "16th Light Dragoons (Left)",
        "16th Light Dragoons (Right)",
      ],
      "10th & 18th Hussars, 1st KGL Hussars": [
        "10th Hussars (Left)",
        "10th Hussars (Right)",
        "18th Hussars (Left)",
        "18th Hussars (Right)",
        "1st Hussars KGL (Left)",
        "1st Hussars KGL (Right)",
      ],
      "23rd Light Dragoons, 1st & 2nd KGL Light Dragoons": [
        "1st Light Dragoons KGL (Left)",
        "1st Light Dragoons KGL (Right)",
        "23rd Light Dragoons (Left)",
        "23rd Light Dragoons (Right)",
        "2nd Light Dragoons KGL (Left)",
        "2nd Light Dragoons KGL (Right)",
      ],
      "7th & 15th Hussars, 13th Light Dragoons": [
        "13th Light Dragoons (Left)",
        "13th Light Dragoons (Right)",
        "15th Hussars (Left)",
        "15th Hussars (Right)",
        "7th Hussars (Left)",
        "7th Hussars (Right)",
      ],
      "3rd KGL Hussars": [
        "3rd Hussars KGL (Centre)",
        "3rd Hussars KGL (Left)",
        "3rd Hussars KGL (Right)",
      ],
      "1st Heavy Brigade (Trip)": [
        "1st Carabiniers (Left)",
        "1st Carabiniers (Right)",
        "2nd Carabiniers (Left)",
        "2nd Carabiniers (Right)",
        "3rd Carabiniers (Left)",
        "3rd Carabiniers (Right)",
      ],
      "1st Light Brigade (Ghigny)": [
        "4th Light Dragoons (Centre)",
        "4th Light Dragoons (Left)",
        "4th Light Dragoons (Right)",
        "8th Hussars (Left)",
        "8th Hussars (Right)",
      ],
      "2nd Light Brigade (van Merlen)": [
        "5th Light Dragoons (Left)",
        "5th Light Dragoons (Right)",
        "6th Hussars (Centre)",
        "6th Hussars (Left)",
        "6th Hussars (Right)",
      ],
      "Cumberland Hussars": [
        "Cumberland Hussars (Left)",
        "Cumberland Hussars (Right)",
      ],
    };
    const brigades = scenario.organizations!
      .filter((organization) => organization.player >= 7)
      .flatMap((organization) => organization.divisions)
      .flatMap((division) => division.brigades);
    for (const [brigade, names] of Object.entries(expected)) {
      const found = brigades.find((item) => item.name === brigade);
      expect({
        brigade,
        names: found?.unitIds
          .map((id) => scenario.units!.find((unit) => unit.id === id)!.name)
          .sort(),
      }).toEqual({ brigade, names });
    }
  });

  // After Nafziger: the Army of the North as it stood on the 18th, without the corps with Grouchy
  // and with Reille's Quatre Bras losses taken off II Corps.
  it("follows the French order of battle, brigade by brigade", () => {
    const expected: Record<string, string[]> = {
      "1st Brigade (Husson)": [
        "61e Regiment de Ligne",
        "I/2e Regiment de Legere",
        "II/2e Regiment de Legere",
        "III/2e Regiment de Legere",
      ],
      "2nd Brigade (Campy)": [
        "72e Regiment de Ligne",
        "I/108e Regiment de Ligne",
        "II/108e Regiment de Ligne",
        "Voltigeurs, 5th Division",
      ],
      "1st Brigade (Gauthier)": [
        "92e Regiment de Ligne",
        "93e Regiment de Ligne",
      ],
      "2nd Brigade (Jamin)": [
        "I/100e Regiment de Ligne",
        "I/4e Regiment de Ligne",
        "II/100e Regiment de Ligne",
        "II/4e Regiment de Ligne",
        "Voltigeurs, 9th Division",
        "Voltigeurs, 9th Division (2)",
      ],
      "1st Brigade (Bauduin)": [
        "3e Regiment de Ligne",
        "I/1ere Regiment de Legere",
        "II/1ere Regiment de Legere",
        "Voltigeurs, 1st Brigade (Bauduin)",
      ],
      "2nd Brigade (Soye)": [
        "I/1ere Regiment de Ligne",
        "I/2e Regiment de Ligne",
        "II/1ere Regiment de Ligne",
        "II/2e Regiment de Ligne",
        "Voltigeurs, 2nd Brigade (Soye)",
        "Voltigeurs, 2nd Brigade (Soye) (2)",
      ],
      "1st Brigade (Hubert)": [
        "I/1er Chasseurs a Cheval",
        "I/6e Chasseurs a Cheval",
        "II/1er Chasseurs a Cheval",
        "II/6e Chasseurs a Cheval",
      ],
      "2nd Brigade (Wathiez)": [
        "5e Chevau-legers Lanciers",
        "I/6e Chevau-legers Lanciers",
        "II/6e Chevau-legers Lanciers",
      ],
      "1st Brigade (Charlet)": [
        "I/54e Regiment de Ligne",
        "I/55e Regiment de Ligne",
        "II/54e Regiment de Ligne",
        "II/55e Regiment de Ligne",
        "Voltigeurs, 1st Division",
      ],
      "2nd Brigade (Bourgeois)": [
        "28e Regiment de Ligne",
        "I/105e Regiment de Ligne",
        "II/105e Regiment de Ligne",
        "Voltigeurs, 2nd Brigade (Bourgeois)",
        "Voltigeurs, 2nd Brigade (Bourgeois) (2)",
      ],
      "1st Brigade (Schmitz)": [
        "17e Regiment de Ligne",
        "I/13e Regiment de Legere",
        "II/13e Regiment de Legere",
        "III/13e Regiment de Legere",
        "Voltigeurs, 2nd Division",
      ],
      "2nd Brigade (Aulard)": [
        "I/19e Regiment de Ligne",
        "I/51e Regiment de Ligne",
        "II/19e Regiment de Ligne",
        "II/51e Regiment de Ligne",
        "Voltigeurs, 2nd Division (2)",
      ],
      "1st Brigade (Noguez)": [
        "I/21e Regiment de Ligne",
        "I/46e Regiment de Ligne",
        "II/21e Regiment de Ligne",
        "Voltigeurs, 3rd Division",
        "Voltigeurs, 3rd Division (2)",
      ],
      "2nd Brigade (Grenier)": [
        "I/25e Regiment de Ligne",
        "I/45e Regiment de Ligne",
        "II/25e Regiment de Ligne",
        "II/45e Regiment de Ligne",
      ],
      "1st Brigade (Pégot)": [
        "I/29e Regiment de Ligne",
        "I/8e Regiment de Ligne",
        "II/29e Regiment de Ligne",
        "II/8e Regiment de Ligne",
        "Voltigeurs, 4th Division",
        "Voltigeurs, 4th Division (2)",
      ],
      "2nd Brigade (Brue)": [
        "85e Regiment de Ligne",
        "95e Regiment de Ligne",
      ],
      "1st Brigade (Bruno)": [
        "I/3e Reg. de Chasseurs a Cheval",
        "I/7e Regiment de Hussards",
        "II/3e Reg. de Chasseurs-a-Cheval",
        "II/7e Regiment de Hussards",
      ],
      "2nd Brigade (Gobrecht)": [
        "I/3e Regiment de Chevaux-legers",
        "I/4e Regiment de Chevaux-legers",
        "II/3e Regiment de Chevaux-legers",
      ],
      "1st Brigade (Bellair)": [
        "I/11e Regiment de Ligne",
        "I/5e Regiment de Ligne",
        "II/11e Regiment de Ligne",
        "II/5e Regiment de Ligne",
      ],
      "2nd Brigade (Thevenet)": [
        "27e Regiment de Ligne",
        "I/84e Regiment de Ligne",
        "II/84e Regiment de Ligne",
      ],
      "1st Brigade (Bony)": [
        "10e Regiment de Ligne",
        "I/5e Regiment de Legere",
        "II/5e Regiment de Legere",
      ],
      "2nd Brigade (Tromelin)": [
        "107e Regiment de Ligne",
        "47e Regiment de Ligne",
      ],
      "1st Brigade (Dommanget)": [
        "4e Chasseurs a Cheval",
        "I/9e Chasseurs a Cheval",
        "II/9e Chasseurs a Cheval",
      ],
      "2nd Brigade (Vinot)": [
        "I/12e Chasseurs a Cheval",
        "II/12e Chasseurs a Cheval",
      ],
      "1st Brigade (Colbert)": [
        "I/1er Chevau-legers Lanciers",
        "I/2e Chevau-legers Lanciers",
        "II/1er Chevau-legers Lanciers",
        "II/2e Chevau-legers Lanciers",
      ],
      "2nd Brigade (Merlin)": [
        "I/11e Chasseurs a Cheval",
        "II/11e Chasseurs a Cheval",
      ],
      "1st Brigade (Picquet)": [
        "I/2e Regiment de Dragons",
        "I/7e Regiment de Dragons",
        "II/2e Regiment de Dragons",
        "II/7e Regiment de Dragons",
      ],
      "2nd Brigade (Guiton)": [
        "I/11e Regiment de Cuirassiers",
        "I/8e Regiment de Cuirassiers",
        "II/8e Regiment de Cuirassiers",
      ],
      "1st Brigade (Blancard)": [
        "I/1er Regiment de Carabiniers",
        "I/2e Regiment de Carabiniers",
        "II/1er Regiment de Carabiniers",
        "II/2e Regiment de Carabiniers",
      ],
      "2nd Brigade (Donop)": [
        "2e Regiment de Cuirassiers",
        "I/3e Regiment de Cuirassiers",
        "II/3e Regiment de Cuirassiers",
      ],
      "1st Brigade (Dubois)": [
        "I/1er Regiment de Cuirassiers",
        "I/4e Regiment de Cuirassiers",
        "II/1er Regiment de Cuirassiers",
      ],
      "2nd Brigade (Travers)": [
        "12e Regiment de Cuirassiers",
        "7e Regiment de Cuirassiers",
      ],
      "1st Brigade (Farine)": [
        "I/10e Regiment de Cuirassiers",
        "I/5e Regiment de Cuirassiers",
        "II/5e Regiment de Cuirassiers",
      ],
      "2nd Brigade (Vial)": [
        "I/6e Regiment de Cuirassiers",
        "I/9e Regiment de Cuirassiers",
        "II/6e Regiment de Cuirassiers",
        "II/9e Regiment de Cuirassiers",
      ],
      "1st & 2nd Grenadiers à Pied": [
        "I/1er Grenadiers a Pied",
        "I/2e Grenadiers a Pied",
        "II/1er Grenadiers a Pied",
        "II/2e Grenadiers a Pied",
      ],
      "1st & 2nd Chasseurs à Pied": [
        "I/1er Chasseurs a Pied",
        "I/2e Chasseurs a Pied",
        "II/1er Chasseurs a Pied",
        "II/2e Chasseurs a Pied",
      ],
      "3rd & 4th Grenadiers à Pied": [
        "4e Grenadiers a Pied",
        "I/3e Grenadiers a Pied",
        "II/3e Grenadiers a Pied",
      ],
      "3rd & 4th Chasseurs à Pied": [
        "I/3e Chasseurs a Pied",
        "I/4e Chasseurs a Pied",
        "II/3e Chasseurs a Pied",
        "II/4e Chasseurs a Pied",
      ],
      "1st & 3rd Tirailleurs": [
        "I/1er Tirailleurs",
        "I/3e Tirailleurs",
        "II/1er Tirailleurs",
        "II/3e Tirailleurs",
      ],
      "1st & 3rd Voltigeurs": [
        "I/1er Voltigeurs",
        "I/3e Voltigeurs",
        "II/1er Voltigeurs",
        "II/3e Voltigeurs",
      ],
      "Chasseurs à Cheval": [
        "Chasseurs a Cheval de la Garde (1)",
        "Chasseurs a Cheval de la Garde (2)",
        "Chasseurs a Cheval de la Garde (3)",
        "Chasseurs a Cheval de la Garde (4)",
        "Chasseurs a Cheval de la Garde (5)",
      ],
      "Lanciers": [
        "1er Chevau-legers Lanciers de la Garde",
        "2e Chevau-legers Lanciers de la Garde (1)",
        "2e Chevau-legers Lanciers de la Garde (2)",
        "2e Chevau-legers Lanciers de la Garde (3)",
      ],
      "Grenadiers à Cheval": [
        "Grenadiers a Cheval (1)",
        "Grenadiers a Cheval (2)",
        "Grenadiers a Cheval (3)",
      ],
      "Dragons de l'Impératrice": [
        "Dragons de l'Imperatrice (1)",
        "Dragons de l'Imperatrice (2)",
        "Dragons de l'Imperatrice (3)",
      ],
    };
    const brigades = scenario.organizations!
      .filter((organization) => organization.player <= 6)
      .flatMap((organization) => organization.divisions)
      .flatMap((division) => division.brigades);
    for (const [brigade, names] of Object.entries(expected)) {
      const found = brigades.find((item) => item.name === brigade);
      expect({
        brigade,
        names: found?.unitIds
          .map((id) => scenario.units!.find((unit) => unit.id === id)!.name)
          .sort(),
      }).toEqual({ brigade, names });
    }
  });

  it("never gives two units the same name", () => {
    const names = scenario.units!
      .filter((unit) => unit.name)
      .map((unit) => unit.name);
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
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

    expect(reinforcements.filter((unit) => unit.player === 11)).toHaveLength(
      57,
    );
    expect(reinforcements.filter((unit) => unit.player === 12)).toHaveLength(
      13,
    );
    expect(reinforcements.filter((unit) => unit.player === 13)).toHaveLength(
      15,
    );

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
