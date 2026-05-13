import {
  Scenario,
  UnitTemplate,
  RangeUnitTemplate,
  FormationTemplate,
  CustomTerrainCategoryOverride,
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
    | "terrainCategory";
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

  const builtInDamageTypeNames = new Set(
    eraGameDataManager.getDamageTypes().map((dt) => dt.name),
  );
  const customDamageTypeNames = new Set(customDamageTypes.map((dt) => dt.name));
  const isKnownDamageType = (name: string) =>
    builtInDamageTypeNames.has(name) || customDamageTypeNames.has(name);

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
    if (rangedTemplate.rangedDamageTypes) {
      for (const dt of rangedTemplate.rangedDamageTypes) {
        if (!isKnownDamageType(dt)) {
          errors.push({
            scope: "unitTemplate",
            field: template.name,
            message: `rangedDamageType "${dt}" is not a built-in or custom damage type`,
          });
        }
      }
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

    // The unit starts in `currentFormation = defaultFormation` and looks up
    // sprite metadata via `formations.find(f => f.id === currentFormation)`.
    // If defaultFormation points outside the unit's own formations[] list
    // (e.g. a clone whose formations were rewritten but defaultFormation
    // wasn't updated), the find returns undefined and rendering falls back
    // to the "unknown" sprite; collisions also resolve through the wrong
    // formation template. Catch the mismatch here so it surfaces as a
    // validation error instead of a silent runtime fallback.
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
