import type { ScenarioCatalog } from "@lob-sdk/game-data-manager/scenario-catalog";
import waterloo from "./scenarios/waterloo.json";
import hills from "./scenarios/hills.json";
import plains from "./scenarios/plains.json";
import iberia from "./scenarios/iberia.json";
import city from "./scenarios/city.json";
import fauconRiverValley from "./scenarios/faucon-river-valley.json";
import saandLakes from "./scenarios/saand-lakes.json";
import amnisNucum from "./scenarios/amnis-nucum.json";
import cittaDeiFalchi from "./scenarios/citta-dei-falchi.json";
import roadToAmnisNucum from "./scenarios/road-to-amnis-nucum.json";
import ruralAlpine from "./scenarios/rural-alpine.json";
import falkenhugel from "./scenarios/falkenhugel.json";
import grobesSchlachtfeld from "./scenarios/grobes-schlachtfeld.json";
import mediterraneaNucum from "./scenarios/mediterranea-nucum.json";
import riverValley from "./scenarios/river-valley.json";
import linesOfLegends from "./scenarios/lines-of-legends.json";
import aestateVillas from "./scenarios/aestate-villas.json";
import borodino from "./scenarios/borodino.json";
import combatAtMollwitz from "./scenarios/combat-at-mollwitz.json";
import clashAtChelmnitz from "./scenarios/clash-at-chelmnitz.json";
import tundra from "./scenarios/tundra.json";
import dresden from "./scenarios/dresden.json";
import blackForest from "./scenarios/black-forest.json";
import lake from "./scenarios/lake.json";
import antioch from "./scenarios/antioch.json";
import silvaSanctorum from "./scenarios/silva-sanctorum.json";
import andesAndValley from "./scenarios/andes-and-valley.json";
import lowCountries from "./scenarios/low-countries.json";
import hedgerows from "./scenarios/hedgerows.json";
import leipzig from "./scenarios/leipzig.json";
import tutorial from "./scenarios/tutorial.json";
import lineOfBattle from "./scenarios/line-of-battle.json";
import twinRiverValley from "./scenarios/twin-river-valley.json";

export const napoleonicScenarioCatalog = {
  plains,
  hills,
  iberia,
  tundra,
  city,
  hedgerows,
  "low-countries": lowCountries,
  lake,
  "black-forest": blackForest,
  "silva-sanctorum": silvaSanctorum,
  "andes-and-valley": andesAndValley,
  "lines-of-legends": linesOfLegends,
  "river-valley": riverValley,
  "saand-lakes": saandLakes,
  "faucon-river-valley": fauconRiverValley,
  "amnis-nucum": amnisNucum,
  "road-to-amnis-nucum": roadToAmnisNucum,
  "aestate-villas": aestateVillas,
  "citta-dei-falchi": cittaDeiFalchi,
  "rural-alpine": ruralAlpine,
  "mediterranea-nucum": mediterraneaNucum,
  falkenhugel,
  "grobes-schlachtfeld": grobesSchlachtfeld,
  antioch,
  waterloo,
  leipzig,
  borodino,
  "combat-at-mollwitz": combatAtMollwitz,
  "clash-at-chelmnitz": clashAtChelmnitz,
  dresden,
  tutorial,
  "line-of-battle": lineOfBattle,
  "twin-river-valley": twinRiverValley,
} as unknown as ScenarioCatalog;
