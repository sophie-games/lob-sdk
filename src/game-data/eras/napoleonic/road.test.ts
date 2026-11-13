import { GameDataManager } from "@lob-sdk/game-data-manager";
import { TerrainType } from "@lob-sdk/types";
import unitTemplates from "./unit-templates.json";

const gdm = GameDataManager.get("napoleonic");
const { TICKS_PER_TURN } = gdm.getGameConstants();

const marching = unitTemplates.filter((t) => t.runMovement > t.walkMovement && !t.name.startsWith("unknown"));

describe("road", () => {
  // A run starts up at its start-up pace for timeToRun ticks, so even the first
  // turn of one must cover more road than a walk does.
  it.each(marching.map((t) => [t.name, t] as const))("lets a running %s outpace a walking one", (_, t) => {
    const walk = t.walkMovement * (1 + gdm.getMovementModifier(TerrainType.Road, t.category));
    const run = 1 + gdm.getRunSpeedModifier(TerrainType.Road, t.category);
    const startUp = t.runStartUpMovement ?? t.walkMovement;
    const firstTurnRun =
      (startUp * t.timeToRun + t.runMovement * (TICKS_PER_TURN - t.timeToRun)) * run;
    expect(firstTurnRun).toBeGreaterThan(walk * TICKS_PER_TURN);
  });
});
