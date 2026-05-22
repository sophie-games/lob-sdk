import {
  Scenario,
  UnitTemplate,
  RangeUnitTemplate,
  FormationTemplate,
  CustomTerrainCategoryOverride,
  CustomSprite,
} from "@lob-sdk/types";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import type {
  DamageTypeTemplate,
  UnitCategoryTemplate,
} from "../game-data-manager/types";

/**
 * Lowest unit-type id reserved for scenario-scoped custom unit templates.
 * Era built-ins use values below this so the ranges never collide.
 */
export const CUSTOM_UNIT_TYPE_MIN = 10000;

export interface CustomDefValidationError {
  scope:
    | "unitTemplate"
    | "damageType"
    | "unitFormation"
    | "unitCategory"
    | "terrainCategory"
    | "customSprite";
  field?: string;
  message: string;
}

/**
 * Validates a scenario's custom unit templates, damage types, and formations
 * against the era registry. Catches id/name collisions and cross-refs to
 * missing damage types or formations before they explode at runtime.
 */
export function validateScenarioCustomDefs(
  scenario: Scenario,
  eraGameDataManager: GameDataManager,
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];

  const customUnitTemplates = scenario.customUnitTemplates ?? [];
  const customDamageTypes = scenario.customDamageTypes ?? [];
  const customUnitFormations = scenario.customUnitFormations ?? [];
  const customUnitCategories = scenario.customUnitCategories ?? [];
  const customTerrainCategories = scenario.customTerrainCategories ?? [];
  const customSprites = scenario.customSprites ?? {};

  errors.push(...validateCustomDamageTypes(customDamageTypes, eraGameDataManager));
  errors.push(
    ...validateCustomUnitFormations(customUnitFormations, eraGameDataManager),
  );
  errors.push(
    ...validateCustomUnitCategories(customUnitCategories, eraGameDataManager),
  );
  errors.push(...validateCustomTerrainCategories(customTerrainCategories));
  errors.push(
    ...validateCustomUnitTemplates(
      customUnitTemplates,
      customDamageTypes,
      customUnitFormations,
      customUnitCategories,
      eraGameDataManager,
    ),
  );
  errors.push(...validateCustomSprites(customSprites, customUnitTemplates));

  return errors;
}

function validateCustomTerrainCategories(
  customTerrainCategories: CustomTerrainCategoryOverride[],
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];
  const seenIds = new Set<string>();

  for (const override of customTerrainCategories) {
    if (!override.id || override.id.trim() === "") {
      errors.push({
        scope: "terrainCategory",
        message: "Terrain category id is required",
      });
      continue;
    }
    if (seenIds.has(override.id)) {
      errors.push({
        scope: "terrainCategory",
        field: override.id,
        message: `Duplicate custom terrain category id "${override.id}"`,
      });
    }
    seenIds.add(override.id);

    if (!override.config) {
      errors.push({
        scope: "terrainCategory",
        field: override.id,
        message: `Terrain category "${override.id}" is missing its config block`,
      });
    }
  }

  return errors;
}

function validateCustomDamageTypes(
  customDamageTypes: DamageTypeTemplate[],
  eraGameDataManager: GameDataManager,
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];
  const seenIds = new Set<number>();
  const seenNames = new Set<string>();
  const builtInDamageTypes = eraGameDataManager.getDamageTypes();
  const builtInDamageTypeIds = new Set(builtInDamageTypes.map((dt) => dt.id));
  const builtInDamageTypeNames = new Set(builtInDamageTypes.map((dt) => dt.name));

  for (const dt of customDamageTypes) {
    if (builtInDamageTypeIds.has(dt.id)) {
      errors.push({
        scope: "damageType",
        field: dt.name,
        message: `Damage type id ${dt.id} collides with a built-in damage type`,
      });
    }
    if (builtInDamageTypeNames.has(dt.name)) {
      errors.push({
        scope: "damageType",
        field: dt.name,
        message: `Damage type name "${dt.name}" collides with a built-in damage type`,
      });
    }
    if (seenIds.has(dt.id)) {
      errors.push({
        scope: "damageType",
        field: dt.name,
        message: `Duplicate custom damage type id ${dt.id}`,
      });
    }
    if (seenNames.has(dt.name)) {
      errors.push({
        scope: "damageType",
        field: dt.name,
        message: `Duplicate custom damage type name "${dt.name}"`,
      });
    }
    // Range brackets are required for ranged damage types — without them the
    // range graphic / max-range calc crashes on the first `ranges[last]` read.
    if (dt.ranged === true && dt.ranges.length === 0) {
      errors.push({
        scope: "damageType",
        field: dt.name,
        message: `Ranged damage type "${dt.name}" needs at least one range bracket`,
      });
    }
    seenIds.add(dt.id);
    seenNames.add(dt.name);
  }

  return errors;
}

function validateCustomUnitFormations(
  customUnitFormations: FormationTemplate[],
  eraGameDataManager: GameDataManager,
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];
  const seenIds = new Set<string>();
  const formationManager = eraGameDataManager.getFormationManager();

  for (const formation of customUnitFormations) {
    if (formationManager.getTemplate(formation.id) !== null) {
      errors.push({
        scope: "unitFormation",
        field: formation.id,
        message: `Formation id "${formation.id}" collides with a built-in formation`,
      });
    }
    if (seenIds.has(formation.id)) {
      errors.push({
        scope: "unitFormation",
        field: formation.id,
        message: `Duplicate custom formation id "${formation.id}"`,
      });
    }
    seenIds.add(formation.id);
  }

  return errors;
}

function validateCustomUnitCategories(
  customUnitCategories: UnitCategoryTemplate[],
  eraGameDataManager: GameDataManager,
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];
  const seenIds = new Set<string>();
  const builtInIds = new Set(
    eraGameDataManager.getUnitCategories().map((c) => c.id),
  );
  const knownOrderNames = new Set(
    eraGameDataManager
      .getOrderTypes()
      .map((id) => eraGameDataManager.tryGetOrderTemplate(id)?.name)
      .filter((name): name is string => !!name),
  );

  for (const category of customUnitCategories) {
    if (!category.id || category.id.trim() === "") {
      errors.push({
        scope: "unitCategory",
        message: "Unit category id is required",
      });
      continue;
    }
    if (builtInIds.has(category.id)) {
      errors.push({
        scope: "unitCategory",
        field: category.id,
        message: `Unit category id "${category.id}" collides with a built-in category`,
      });
    }
    if (seenIds.has(category.id)) {
      errors.push({
        scope: "unitCategory",
        field: category.id,
        message: `Duplicate custom unit category id "${category.id}"`,
      });
    }
    seenIds.add(category.id);

    // Catch unknown allowedOrders here so loadCustomDefs doesn't throw at
    // game-start time when it tries to map names to OrderType ids.
    for (const orderName of category.allowedOrders ?? []) {
      if (!knownOrderNames.has(orderName)) {
        errors.push({
          scope: "unitCategory",
          field: category.id,
          message: `allowedOrders entry "${orderName}" is not a known order for this era`,
        });
      }
    }
  }

  return errors;
}

function validateCustomUnitTemplates(
  customUnitTemplates: UnitTemplate[],
  customDamageTypes: DamageTypeTemplate[],
  customUnitFormations: FormationTemplate[],
  customUnitCategories: UnitCategoryTemplate[],
  eraGameDataManager: GameDataManager,
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];
  const seenIds = new Set<number>();
  const builtInTemplates = eraGameDataManager.getUnitTemplateManager().getTemplates();
  const builtInIds = new Set(builtInTemplates.map((t) => t.type));

  const damageTypeByName = new Map<string, DamageTypeTemplate>();
  for (const dt of eraGameDataManager.getDamageTypes()) damageTypeByName.set(dt.name, dt);
  for (const dt of customDamageTypes) damageTypeByName.set(dt.name, dt);
  const isKnownDamageType = (name: string) => damageTypeByName.has(name);

  const formationManager = eraGameDataManager.getFormationManager();
  const customFormationIds = new Set(customUnitFormations.map((f) => f.id));
  const isKnownFormation = (id: string) =>
    formationManager.getTemplate(id) !== null || customFormationIds.has(id);

  const builtInCategoryIds = new Set(
    eraGameDataManager.getUnitCategories().map((c) => c.id),
  );
  const customCategoryIds = new Set(customUnitCategories.map((c) => c.id));
  const isKnownCategory = (id: string) =>
    builtInCategoryIds.has(id) || customCategoryIds.has(id);

  for (const template of customUnitTemplates) {
    if (template.type < CUSTOM_UNIT_TYPE_MIN) {
      errors.push({
        scope: "unitTemplate",
        field: template.name,
        message: `Custom unit type id ${template.type} must be >= ${CUSTOM_UNIT_TYPE_MIN}`,
      });
    }
    if (builtInIds.has(template.type)) {
      errors.push({
        scope: "unitTemplate",
        field: template.name,
        message: `Custom unit type id ${template.type} collides with a built-in unit type`,
      });
    }
    if (seenIds.has(template.type)) {
      errors.push({
        scope: "unitTemplate",
        field: template.name,
        message: `Duplicate custom unit type id ${template.type}`,
      });
    }
    seenIds.add(template.type);

    if (!isKnownCategory(template.category)) {
      errors.push({
        scope: "unitTemplate",
        field: template.name,
        message: `category "${template.category}" is not a built-in or custom unit category`,
      });
    }

    if (!isKnownDamageType(template.meleeDamageType)) {
      errors.push({
        scope: "unitTemplate",
        field: template.name,
        message: `meleeDamageType "${template.meleeDamageType}" is not a built-in or custom damage type`,
      });
    }

    const rangedTemplate = template as RangeUnitTemplate;
    const rangedDamageTypes = rangedTemplate.rangedDamageTypes ?? [];
    // A ranged unit (rangedAttack > 0) without rangedDamageTypes crashes
    // BaseUnit.getMaxRange — the empty array is truthy, then ranges[-1] is
    // undefined and getDamageTypeByName(undefined) throws.
    if ((rangedTemplate.rangedAttack ?? 0) > 0 && rangedDamageTypes.length === 0) {
      errors.push({
        scope: "unitTemplate",
        field: template.name,
        message: `rangedAttack > 0 but rangedDamageTypes is empty — runtime will crash on getMaxRange`,
      });
    }
    for (const dtName of rangedDamageTypes) {
      const dt = damageTypeByName.get(dtName);
      if (!dt) {
        errors.push({
          scope: "unitTemplate",
          field: template.name,
          message: `rangedDamageType "${dtName}" is not a built-in or custom damage type`,
        });
      } else if (dt.ranged !== true) {
        // Cross-ref to a melee damage type — the runtime casts to
        // RangedDamageTypeTemplate and crashes on missing `.ranges`.
        errors.push({
          scope: "unitTemplate",
          field: template.name,
          message: `rangedDamageType "${dtName}" references a melee damage type`,
        });
      }
    }

    if (template.formations.length === 0) {
      errors.push({
        scope: "unitTemplate",
        field: template.name,
        message: `formations is empty — unit needs at least one formation`,
      });
    }
    for (const formation of template.formations) {
      if (!isKnownFormation(formation.id)) {
        errors.push({
          scope: "unitTemplate",
          field: template.name,
          message: `formation id "${formation.id}" is not a built-in or custom formation`,
        });
      }
    }

    if (!isKnownFormation(template.defaultFormation)) {
      errors.push({
        scope: "unitTemplate",
        field: template.name,
        message: `defaultFormation "${template.defaultFormation}" is not a built-in or custom formation`,
      });
    }

    // defaultFormation must be in the unit's own formations[] — otherwise
    // the runtime falls back to the "unknown" sprite and wrong collision
    // template via `formations.find(f => f.id === currentFormation)`.
    if (
      template.defaultFormation &&
      !template.formations.some((f) => f.id === template.defaultFormation)
    ) {
      errors.push({
        scope: "unitTemplate",
        field: template.name,
        message: `defaultFormation "${template.defaultFormation}" must match one of the unit's formations (${template.formations.map((f) => f.id).join(", ") || "<empty>"})`,
      });
    }
  }

  return errors;
}

/**
 * Per-sprite byte budget for uploaded custom sprites: the editor re-encodes to
 * fit this and scenario import re-checks it server-side. Aggregate weight is
 * bounded separately by the 150KB compressed import guard.
 */
export const CUSTOM_SPRITE_MAX_BYTES = 32 * 1024;

/** Prefix the editor gives to uploaded-sprite names so they never collide with built-ins. */
export const CUSTOM_SPRITE_NAME_PREFIX = "cs_";

/** Decoded byte length of a base64 data-URL (without decoding it). */
export function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return 0;
  const b64 = dataUrl.slice(comma + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

function validateCustomSprites(
  customSprites: Record<string, CustomSprite>,
  customUnitTemplates: UnitTemplate[],
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];

  for (const [name, sprite] of Object.entries(customSprites)) {
    if (!/^data:image\/(webp|png);base64,/.test(sprite?.dataUrl ?? "")) {
      errors.push({
        scope: "customSprite",
        field: name,
        message: `customSprite "${name}" must be a base64 data-URL of image/webp or image/png`,
      });
      continue;
    }
    if (!(sprite.width > 0) || !(sprite.height > 0)) {
      errors.push({
        scope: "customSprite",
        field: name,
        message: `customSprite "${name}" must have positive width and height`,
      });
    }
    if (dataUrlByteLength(sprite.dataUrl) > CUSTOM_SPRITE_MAX_BYTES) {
      errors.push({
        scope: "customSprite",
        field: name,
        message: `customSprite "${name}" exceeds the ${Math.round(CUSTOM_SPRITE_MAX_BYTES / 1024)}KB per-sprite limit`,
      });
    }
  }

  // Dangling refs: a formation pointing at a cs_ sprite that was not embedded.
  for (const template of customUnitTemplates) {
    for (const formation of template.formations) {
      for (const ref of [formation.baseSprite, formation.overlaySprite]) {
        if (
          typeof ref === "string" &&
          ref.startsWith(CUSTOM_SPRITE_NAME_PREFIX) &&
          !(ref in customSprites)
        ) {
          errors.push({
            scope: "customSprite",
            field: template.name,
            message: `formation "${formation.id}" references missing custom sprite "${ref}"`,
          });
        }
      }
    }
  }

  return errors;
}
