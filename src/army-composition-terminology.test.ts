import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const enDir = join(__dirname, "../locales/en");

describe("English copy", () => {
  it.each(readdirSync(enDir).filter((file) => file.endsWith(".json")))(
    "%s says army composition, not force composition",
    (file) => {
      const text = readFileSync(join(enDir, file), "utf8");
      expect(text).not.toMatch(/:\s*"[^"]*force compositions?/i);
    },
  );
});
