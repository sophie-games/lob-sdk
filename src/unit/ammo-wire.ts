import type { GameDataManager } from "@lob-sdk/game-data-manager";
import type { AmmoPools } from "@lob-sdk/types";

export interface AmmoWire {
  /** The era's default ammo type, the field clients before per-type ammo read. */
  am?: number;
  /** Every other ammo type, keyed by ammo type id. */
  amt?: Record<number, number>;
}

/** Encodes the given pools; types absent from `pools` are not sent. */
export const ammoToWire = (
  pools: AmmoPools,
  gameDataManager: GameDataManager,
): AmmoWire => {
  const defaultName = gameDataManager.getDefaultAmmoType().name;
  const wire: AmmoWire = {};

  for (const [name, value] of Object.entries(pools)) {
    if (name === defaultName) {
      wire.am = value;
    } else {
      wire.amt ??= {};
      wire.amt[gameDataManager.getAmmoTypeByName(name).id] = value;
    }
  }

  return wire;
};

/** Returns `base` with the wire's values written over it; types `base` lacks are ignored. */
export const ammoFromWire = (
  base: AmmoPools,
  am: number | undefined,
  amt: Record<number, number> | undefined,
  gameDataManager: GameDataManager,
): AmmoPools => {
  const pools = { ...base };
  const write = (name: string, value: number) => {
    if (name in pools) pools[name] = value;
  };

  if (am !== undefined) {
    write(gameDataManager.getDefaultAmmoType().name, am);
  }
  for (const [id, value] of Object.entries(amt ?? {})) {
    write(gameDataManager.getAmmoTypeById(Number(id)).name, value);
  }

  return pools;
};
