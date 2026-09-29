import { GameDataManager } from "@lob-sdk/game-data-manager";
import { TerrainCategoryType, TerrainType } from "@lob-sdk/types";

// Light forest is open woodland - chestnut groves, orchards, the tree rows of the Po plain -
// that troops cross in formation. It screens and shelters less than forest and slows less,
// so a wooded map still leaves room for lines and columns.

const gdm = GameDataManager.get("napoleonic");
const { Forest, FarmGrowing, LightForest, LightForestWinter } = TerrainType;

describe("light forest", () => {
  it.each([LightForest, LightForestWinter])("%s is light forest in every season", (terrain) => {
    expect(gdm.getCategoryByTerrain(terrain)).toBe(TerrainCategoryType.LightForest);
  });

  it("hides troops less than forest and more than standing crops", () => {
    const vision = gdm.getVisionAbsorption(LightForest);
    expect(vision).toBeGreaterThan(gdm.getVisionAbsorption(FarmGrowing));
    expect(vision).toBeLessThan(gdm.getVisionAbsorption(Forest));
  });

  it.each(["infantry", "lightCavalry", "artillery"])("slows %s less than forest does", (category) => {
    const light = gdm.getMovementModifier(LightForest, category);
    expect(light).toBeLessThan(0);
    expect(light).toBeGreaterThan(gdm.getMovementModifier(Forest, category));
  });

  it("lets troops run through it, which forest does not", () => {
    expect(gdm.getRunSpeedModifier(Forest, "infantry")).toBe(0);
    expect(gdm.getRunSpeedModifier(LightForest, "infantry")).toBeLessThan(0);
  });

  it("stops less musketry than forest does", () => {
    const light = gdm.getTerrainProjectileAbsorption(LightForest, "musket");
    expect(light).toBeGreaterThan(0);
    expect(light).toBeLessThan(gdm.getTerrainProjectileAbsorption(Forest, "musket"));
  });
});
