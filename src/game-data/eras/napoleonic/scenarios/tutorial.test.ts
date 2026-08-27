import tutorial from "./tutorial.json";

const formationSensitiveCopyKeys = [
  "tutorial.situational.infantryVsSkirmishers.intro",
  "tutorial.situational.infantryVsSkirmishers.pickWalk",
  "tutorial.situational.infantryVsArtillery.intro",
  "tutorial.situational.infantryVsArtillery.pickRun",
  "tutorial.situational.infantryColumnMarch.intro",
] as const;

const obsoleteMassTermsByLocale = {
  en: /\bmass\b/i,
  es: /\bmasa\b/i,
  fr: /\bmasse\b/i,
  de: /\bmass(?:e|en\w*)\b/iu,
  ru: /масс/iu,
  pt: /\bmassa\b/i,
  it: /\bmassa\b/i,
  pl: /\bmas(?:a|ow\w*)\b/iu,
  tr: /\b(?:kütle|toplu\w*)\b/iu,
  uk: /мас(?:а|ов\w*)/iu,
  vi: /(?:khối lượng|hàng loạt)/iu,
  zh: /(?:大批|质量|大量|群众|人群)/u,
  ja: /(?:マス(?!ケット)|集団)/u,
  kr: /(?:대량|질량|집단)/u,
  ar: /(?:الكتلة|جماعي)/u,
  hi: /(?:सामूहिक|द्रव्यमान)/u,
  id: /\b(?:massa|massal)\b/i,
  hu: /\btömeg\w*\b/iu,
  el: /μαζ(?:α|ικ)\w*/iu,
} satisfies Record<keyof typeof tutorial.locales, RegExp>;

describe("napoleonic tutorial copy", () => {
  it("does not teach the removed mass formation in any locale", () => {
    for (const locale of Object.keys(
      tutorial.locales,
    ) as (keyof typeof tutorial.locales)[]) {
      const formationSensitiveCopy = formationSensitiveCopyKeys
        .map((key) => tutorial.locales[locale][key])
        .join("\n");

      expect(formationSensitiveCopy).not.toMatch(
        obsoleteMassTermsByLocale[locale],
      );
    }
  });
});
