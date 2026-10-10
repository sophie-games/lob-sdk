import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { gameTips } from "./index";

describe("game tip catalog", () => {
  it("has unique stable IDs and contains only serializable data", () => {
    expect(new Set(gameTips.map((tip) => tip.id)).size).toBe(gameTips.length);
    expect(JSON.parse(JSON.stringify(gameTips))).toEqual(gameTips);
    for (const tip of gameTips) {
      expect(tip.id.length).toBeGreaterThan(0);
      expect(tip.on.length).toBeGreaterThan(0);
    }
  });

  const locales = resolve(__dirname, "../../locales");
  it.each(readdirSync(locales).filter((name) => !name.startsWith(".")))(
    "resolves all catalog text and CTA keys in %s",
    (language) => {
      for (const tip of gameTips) {
        for (const key of [
          tip.titleKey,
          tip.descriptionKey,
          ...(tip.action ? [tip.action.labelKey] : []),
        ]) {
          const [namespace, path] = key.includes(":")
            ? key.split(":")
            : ["common", key];
          const content = JSON.parse(
            readFileSync(
              resolve(locales, language, `${namespace}.json`),
              "utf8",
            ).replace(/^\uFEFF/, ""),
          );
          const value = path
            .split(".")
            .reduce((data, segment) => data?.[segment], content);
          expect({
            key,
            translated: typeof value === "string" && value.length > 0,
          }).toEqual({ key, translated: true });
        }
      }
    },
  );
});
