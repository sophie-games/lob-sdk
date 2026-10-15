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
import falkenhugel from "./scenarios/falkenhugel.json";
import mediterraneaNucum from "./scenarios/mediterranea-nucum.json";
import riverValley from "./scenarios/river-valley.json";
import linesOfLegends from "./scenarios/lines-of-legends.json";
import tundra from "./scenarios/tundra.json";
import andesAndValley from "./scenarios/andes-and-valley.json";
import lowCountries from "./scenarios/low-countries.json";
import hedgerows from "./scenarios/hedgerows.json";
import lineOfBattle from "./scenarios/line-of-battle.json";
import warRoomFiftyVsFifty from "./scenarios/war-room-50-vs-50.json";
import roadToPressburg from "./scenarios/road-to-pressburg.json";
import laMeuse from "./scenarios/la-meuse.json";
import twinRiverValley from "./scenarios/twin-river-valley.json";
import riverCrossing from "./scenarios/river-crossing.json";
import alpineValley from "./scenarios/alpine-valley.json";
import apennineRidges from "./scenarios/apennine-ridges.json";
import marshDikes from "./scenarios/marsh-dikes.json";
import rivoliPlateau from "./scenarios/rivoli-plateau.json";
import mantua1797 from "./scenarios/mantua-1797.json";
import caldiero1805 from "./scenarios/caldiero-1805.json";
import austerlitz1805 from "./scenarios/austerlitz-1805.json";
import teugnHausen1809 from "./scenarios/teugn-hausen-1809.json";
import hillshire from "./scenarios/hillshire.json";
import grunlingen from "./scenarios/grunlingen.json";
import frozenSwamp from "./scenarios/frozen-swamp.json";

export const napoleonicScenarioCatalog = {
  plains,
  hills,
  iberia,
  tundra,
  city,
  hedgerows,
  "low-countries": lowCountries,
  "andes-and-valley": andesAndValley,
  "lines-of-legends": linesOfLegends,
  "river-valley": riverValley,
  "saand-lakes": saandLakes,
  "faucon-river-valley": fauconRiverValley,
  "amnis-nucum": amnisNucum,
  "citta-dei-falchi": cittaDeiFalchi,
  "mediterranea-nucum": mediterraneaNucum,
  falkenhugel,
  waterloo,
  "line-of-battle": lineOfBattle,
  "war-room-50-vs-50": warRoomFiftyVsFifty,
  "twin-river-valley": twinRiverValley,
  "la-meuse": laMeuse,
  "road-to-pressburg": roadToPressburg,
  "river-crossing": riverCrossing,
  "alpine-valley": alpineValley,
  "apennine-ridges": apennineRidges,
  "marsh-dikes": marshDikes,
  "rivoli-plateau": rivoliPlateau,
  "mantua-1797": mantua1797,
  "caldiero-1805": caldiero1805,
  "austerlitz-1805": austerlitz1805,
  "teugn-hausen-1809": teugnHausen1809,
  hillshire,
  grunlingen,
  "frozen-swamp": frozenSwamp,
} as unknown as ScenarioCatalog;
