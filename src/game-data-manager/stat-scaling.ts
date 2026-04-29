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

// ── helpers ──────────────────────────────────────────────────────────

/** Multiply a value by the scale factor (no-op for undefined). */
const scale = (v: number): number => v * STAT_PRECISION_SCALE;
const scaleOpt = (v: number | undefined): number | undefined =>
  v !== undefined ? v * STAT_PRECISION_SCALE : undefined;

// ── Unit Templates ───────────────────────────────────────────────────

const isRanged = (t: UnitTemplate): t is RangeUnitTemplate =>
  "rangedAttack" in t;

export function scaleUnitTemplate(raw: UnitTemplate): UnitTemplate {
  const base: UnitTemplate = {
    ...raw,
    hp: scale(raw.hp),
    org: scale(raw.org),
    shattersAtOrg: scale(raw.shattersAtOrg),
    routesAtOrg: scale(raw.routesAtOrg),
    recoversAtOrg: scale(raw.recoversAtOrg),
    ralliesAtOrg: scale(raw.ralliesAtOrg),
    meleeAttack: scale(raw.meleeAttack),
    meleeDefense: scale(raw.meleeDefense),
    chargeBonus: scale(raw.chargeBonus),
    runCost: scale(raw.runCost),
    orgRadiusBonus: scale(raw.orgRadiusBonus),
    stamina: scaleOpt(raw.stamina),
    supply: scaleOpt(raw.supply),
    supplyConsumptionIdle: scaleOpt(raw.supplyConsumptionIdle),
    supplyConsumptionMoving: scaleOpt(raw.supplyConsumptionMoving),
    supplyConsumptionCombating: scaleOpt(raw.supplyConsumptionCombating),
  };

  if (isRanged(raw)) {
    return {
      ...base,
      rangedAttack: scale(raw.rangedAttack),
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
      orgDamageRatio: scale(dt.orgDamageRatio),
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
      meleeTurnCost: scale(rules.stamina.meleeTurnCost),
      rangedTurnCost: scale(rules.stamina.rangedTurnCost),
      regainRates: {
        range1: scale(rules.stamina.regainRates.range1),
        range2: scale(rules.stamina.regainRates.range2),
        range3: scale(rules.stamina.regainRates.range3),
        range4: scale(rules.stamina.regainRates.range4),
        range5: scale(rules.stamina.regainRates.range5),
      },
    };
  }

  if (rules.ammo) {
    scaled.ammo = {
      ...rules.ammo,
      baseReserve: scale(rules.ammo.baseReserve),
    };
  }

  if (rules.organization) {
    scaled.organization = {
      ...rules.organization,
      nearbyUnitsPositiveOrgBonusCap: scale(
        rules.organization.nearbyUnitsPositiveOrgBonusCap,
      ),
      nearbyUnitsNegativeOrgBonusCap: scale(
        rules.organization.nearbyUnitsNegativeOrgBonusCap,
      ),
      routingUnitNearbyUnitsOrgBonus: scale(
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
    CAN_LEAVE_MAP_MIN_ORG: scale(constants.CAN_LEAVE_MAP_MIN_ORG),
    HEIGHT_CHANGE_STAMINA_COST: scale(constants.HEIGHT_CHANGE_STAMINA_COST),
    HEIGHT_CHANGE_RUNNING_STAMINA_COST: scale(
      constants.HEIGHT_CHANGE_RUNNING_STAMINA_COST,
    ),
  };
}

// ── Battle Types ─────────────────────────────────────────────────────

export function scaleBattleTypes(
  battleTypes: Record<DynamicBattleType, BattleTypeTemplate>,
): Record<DynamicBattleType, BattleTypeTemplate> {
  const scaled: Record<DynamicBattleType, BattleTypeTemplate> = {} as any;
  for (const [key, bt] of Object.entries(battleTypes)) {
    scaled[key] = {
      ...bt,
      ammoReserve: scale(bt.ammoReserve),
      goldToAmmoRate: scale(bt.goldToAmmoRate),
    };
  }
  return scaled;
}
