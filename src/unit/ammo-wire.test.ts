import { GameDataManager } from "@lob-sdk/game-data-manager";
import { ammoFromWire, ammoToWire } from "./ammo-wire";

describe("ammo wire encoding", () => {
  const gdm = GameDataManager.get("napoleonic");
  const canisterId = gdm.getAmmoTypeByName("canister").id;
  const rocketId = gdm.getAmmoTypeByName("rocket").id;

  it("keeps the default type in `am` so older clients still read it", () => {
    expect(ammoToWire({ "round-shot": 150, canister: 6 }, gdm)).toEqual({
      am: 150,
      amt: { [canisterId]: 6 },
    });
  });

  it("omits both fields when nothing is sent", () => {
    expect(ammoToWire({}, gdm)).toEqual({});
  });

  it("sends a unit without the default type only in `amt`", () => {
    expect(ammoToWire({ rocket: 300 }, gdm)).toEqual({
      amt: { [rocketId]: 300 },
    });
  });

  it("overlays the wire fields onto a base", () => {
    const base = { "round-shot": 200, canister: 60 };
    expect(ammoFromWire(base, undefined, { [canisterId]: 6 }, gdm)).toEqual({
      "round-shot": 200,
      canister: 6,
    });
    expect(ammoFromWire(base, 150, undefined, gdm)).toEqual({
      "round-shot": 150,
      canister: 60,
    });
  });

  it("round-trips", () => {
    const pools = { "round-shot": 1, canister: 2, shell: 3 };
    const { am, amt } = ammoToWire(pools, gdm);
    expect(ammoFromWire({}, am, amt, gdm)).toEqual(pools);
  });
});
