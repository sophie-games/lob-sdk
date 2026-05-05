/**
 * Resource stats (hp, org, stamina, ammo, attack, defense, etc.) are stored
 * pre-multiplied by this factor in the era JSON files so the runtime can use
 * `Math.round` without losing precision. The UI divides by it before display.
 */
export const STAT_PRECISION_SCALE = 100;
