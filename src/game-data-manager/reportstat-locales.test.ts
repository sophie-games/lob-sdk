import * as fs from "fs";
import * as path from "path";
import napoleonicTemplates from "@lob-sdk/game-data/eras/napoleonic/unit-templates.json";

/**
 * Every reportStats key a unit template uses must have a non-empty label in
 * every locale, because the battle report renders tEra(`reportStats.${key}`).
 * Guards against shipping a new stat (e.g. the ship's `ships`) without labels.
 */
const LANGS = [
  "ar", "de", "el", "en", "es", "fr", "hi", "hu", "id", "it",
  "ja", "kr", "pl", "pt", "ru", "tr", "uk", "vi", "zh",
];

describe("napoleonic reportStats locales", () => {
  const usedKeys = new Set<string>();
  const templates = napoleonicTemplates as unknown as Array<{
    reportStats?: Record<string, unknown>;
  }>;
  for (const t of templates) {
    for (const k of Object.keys(t.reportStats ?? {})) usedKeys.add(k);
  }

  it.each(LANGS)("%s labels every reportStats key", (lang) => {
    const file = path.join(
      __dirname,
      "../../locales",
      lang,
      "era/napoleonic.json",
    );
    const labels: Record<string, string> =
      JSON.parse(fs.readFileSync(file, "utf-8")).reportStats ?? {};
    const missing = [...usedKeys].filter((k) => !labels[k]);
    expect(missing).toEqual([]);
  });
});
