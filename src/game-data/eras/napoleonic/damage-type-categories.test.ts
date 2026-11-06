import { GameDataManager } from "@lob-sdk/game-data-manager";
import { readFileSync } from "fs";
import { join } from "path";

// Read rather than import: common's tsconfig compiles this file but does not
// list the locale JSON among its inputs.
const enNapoleonic: { damageTypeCategory: Record<string, string> } = JSON.parse(
  readFileSync(
    join(__dirname, "../../../../locales/en/era/napoleonic.json"),
    "utf8",
  ),
);

const damageTypes = GameDataManager.get("napoleonic").getDamageTypes();

const categories = new Map<string, string[]>();
for (const { name, category } of damageTypes) {
  if (!category) continue;
  categories.set(category, [...(categories.get(category) ?? []), name]);
}

describe("napoleonic damage type categories", () => {
  it("groups every cannon ball, canister and shell", () => {
    expect(Object.fromEntries(categories)).toEqual({
      cannonBall: [
        "18lb-cannon-ball",
        "12lb-cannon-ball",
        "10lb-cannon-ball",
        "8lb-cannon-ball",
        "6lb-cannon-ball",
        "4lb-cannon-ball",
        "ship-cannon",
      ],
      canister: [
        "12lb-canister-fire",
        "8lb-canister-fire",
        "6lb-canister-fire",
        "4lb-canister-fire",
        "18lb-canister-fire",
        "10lb-canister-fire",
        "howitzer-canister",
      ],
      explosiveShell: [
        "18lb-explosive-shell",
        "10lb-explosive-shell",
        "explosive-shell",
      ],
      sword: [
        "cavalry-sabre",
        "cavalry-sword",
        "dragoon-sword",
        "artillery-sabre",
      ],
    });
  });

  it("never puts a lone damage type in a category", () => {
    for (const [category, members] of categories) {
      expect([category, members.length > 1]).toEqual([category, true]);
    }
  });

  it("names every category in the English era locale", () => {
    expect(Object.keys(enNapoleonic.damageTypeCategory).sort()).toEqual(
      [...categories.keys()].sort(),
    );
  });
});
