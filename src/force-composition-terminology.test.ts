import { readdirSync, readFileSync } from "fs";
import { join } from "path";

// A composition can be a division or a vanguard, not only an army.
const enDir = join(__dirname, "../locales/en");

describe("English copy", () => {
  it.each(readdirSync(enDir).filter((file) => file.endsWith(".json")))(
    "%s says force composition, not army composition",
    (file) => {
      const text = readFileSync(join(enDir, file), "utf8");
      expect(text).not.toMatch(/:\s*"[^"]*army compositions?/i);
    },
  );
});
