import {
  UnitTemplate,
  RangeUnitTemplate,
  BattleTypeTemplate,
  DynamicBattleType,
} from "@lob-sdk/types";
import {
  DamageTypeTemplate,
  GameConstants,
  GameRules,
  RangedDamageTypeTemplate,
} from "./types";

/**
 * All resource stats (hp, org, stamina, ammo, supply) and their related
 * values (attack, defense, damage ratios, costs, regain rates, etc.) are
 * stored internally multiplied by this factor.
 *
 * This eliminates the need for probabilistic rounding — plain Math.round
 * is precise enough when values are 100× larger.
 *
 * Divide by this constant before displaying values in the UI.
 */
export const STAT_PRECISION_SCALE = 100;

/** Convert an internally-scaled stat back to its original display value (rounded). */
export const unscaleStat = (v: number): number =>
  Math.round(v / STAT_PRECISION_SCALE);

/** Convert a display-level value to its internally-scaled representation. */
export const scaleStat = (v: number): number => v * STAT_PRECISION_SCALE;

// ── helpers ──────────────────────────────────────────────────────────

const scaleOpt = (v: number | undefined): number | undefined =>
  v !== undefined ? scaleStat(v) : undefined;

// ── Unit Templates ───────────────────────────────────────────────────

const isRanged = (t: UnitTemplate): t is RangeUnitTemplate =>
  "rangedAttack" in t;

export function scaleUnitTemplate(raw: UnitTemplate): UnitTemplate {
  const base: UnitTemplate = {
    ...raw,
    hp: scaleStat(raw.hp),
    org: scaleStat(raw.org),
    shattersAtOrg: scaleStat(raw.shattersAtOrg),
    routesAtOrg: scaleStat(raw.routesAtOrg),
    recoversAtOrg: scaleStat(raw.recoversAtOrg),
    ralliesAtOrg: scaleStat(raw.ralliesAtOrg),
    meleeAttack: scaleStat(raw.meleeAttack),
    meleeDefense: scaleStat(raw.meleeDefense),
    chargeBonus: scaleStat(raw.chargeBonus),
    runCost: scaleStat(raw.runCost),
    orgRadiusBonus: scaleStat(raw.orgRadiusBonus),
    stamina: scaleOpt(raw.stamina),
    supply: scaleOpt(raw.supply),
    supplyConsumptionIdle: scaleOpt(raw.supplyConsumptionIdle),
    supplyConsumptionMoving: scaleOpt(raw.supplyConsumptionMoving),
    supplyConsumptionCombating: scaleOpt(raw.supplyConsumptionCombating),
  };

  if (isRanged(raw)) {
    return {
      ...base,
      rangedAttack: scaleStat(raw.rangedAttack),
      ammo: scaleOpt(raw.ammo),
    };
  }

  return base;
}

export function scaleUnitTemplates(templates: UnitTemplate[]): UnitTemplate[] {
  return templates.map(scaleUnitTemplate);
}

// ── Damage Types ─────────────────────────────────────────────────────

function isRangedDamageType(
  dt: DamageTypeTemplate,
): dt is RangedDamageTypeTemplate {
  return dt.ranged === true;
}

export function scaleDamageTypes(
  types: DamageTypeTemplate[],
): DamageTypeTemplate[] {
  return types.map((dt) => {
    const scaled = {
      ...dt,
      orgDamageRatio: scaleStat(dt.orgDamageRatio),
    };

    if (isRangedDamageType(dt)) {
      scaled.ammoCost = scaleOpt(dt.ammoCost);
    }

    return scaled;
  });
}

// ── Game Rules ───────────────────────────────────────────────────────

export function scaleGameRules(rules: GameRules): GameRules {
  const scaled: GameRules = { ...rules };

  if (rules.stamina) {
    scaled.stamina = {
      ...rules.stamina,
      meleeTurnCost: scaleStat(rules.stamina.meleeTurnCost),
      rangedTurnCost: scaleStat(rules.stamina.rangedTurnCost),
      regainRates: {
        range1: scaleStat(rules.stamina.regainRates.range1),
        range2: scaleStat(rules.stamina.regainRates.range2),
        range3: scaleStat(rules.stamina.regainRates.range3),
        range4: scaleStat(rules.stamina.regainRates.range4),
        range5: scaleStat(rules.stamina.regainRates.range5),
      },
    };
  }

  if (rules.ammo) {
    scaled.ammo = {
      ...rules.ammo,
      baseReserve: scaleStat(rules.ammo.baseReserve),
    };
  }

  if (rules.organization) {
    scaled.organization = {
      ...rules.organization,
      nearbyUnitsPositiveOrgBonusCap: scaleStat(
        rules.organization.nearbyUnitsPositiveOrgBonusCap,
      ),
      nearbyUnitsNegativeOrgBonusCap: scaleStat(
        rules.organization.nearbyUnitsNegativeOrgBonusCap,
      ),
      routingUnitNearbyUnitsOrgBonus: scaleStat(
        rules.organization.routingUnitNearbyUnitsOrgBonus,
      ),
    };
  }

  return scaled;
}

// ── Game Constants ───────────────────────────────────────────────────

export function scaleGameConstants(constants: GameConstants): GameConstants {
  return {
    ...constants,
    CAN_LEAVE_MAP_MIN_ORG: scaleStat(constants.CAN_LEAVE_MAP_MIN_ORG),
    HEIGHT_CHANGE_STAMINA_COST: scaleStat(constants.HEIGHT_CHANGE_STAMINA_COST),
    HEIGHT_CHANGE_RUNNING_STAMINA_COST: scaleStat(
      constants.HEIGHT_CHANGE_RUNNING_STAMINA_COST,
    ),
  };
}

// ── Battle Types ─────────────────────────────────────────────────────

export function scaleBattleTypes(
  battleTypes: Record<DynamicBattleType, BattleTypeTemplate>,
): Record<DynamicBattleType, BattleTypeTemplate> {
  const scaled: Record<DynamicBattleType, BattleTypeTemplate> = {};
  for (const [key, bt] of Object.entries(battleTypes)) {
    scaled[key] = {
      ...bt,
      ammoReserve: scaleStat(bt.ammoReserve),
      goldToAmmoRate: scaleStat(bt.goldToAmmoRate),
    };
  }
  return scaled;
}
