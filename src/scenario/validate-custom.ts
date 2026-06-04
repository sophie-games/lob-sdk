import {
  Scenario,
  UnitTemplate,
  RangeUnitTemplate,
  FormationTemplate,
  CustomTerrainCategoryOverride,
  CustomSprite,
  OrderTemplate,
  OrderType,
} from "@lob-sdk/types";
import { GameDataManager } from "@lob-sdk/game-data-manager";
import type {
  DamageTypeTemplate,
  UnitCategoryTemplate,
  GameConstants,
  GameRules,
} from "../game-data-manager/types";
import type { DeepPartial } from "../utils/object-merge";

/**
 * Lowest unit-type id reserved for scenario-scoped custom unit templates.
 * Era built-ins use values below this so the ranges never collide.
 */
export const CUSTOM_UNIT_TYPE_MIN = 10000;

/**
 * Hard safety ceilings on how many custom defs a single scenario may carry.
 * Abuse bounds (independent of tier gating), enforced server-side so a crafted
 * import can't pack thousands of defs that get re-parsed per game.
 */
export const MAX_CUSTOM_UNIT_TEMPLATES = 100;
export const MAX_CUSTOM_DAMAGE_TYPES = 50;
export const MAX_CUSTOM_UNIT_FORMATIONS = 50;
export const MAX_CUSTOM_UNIT_CATEGORIES = 50;
export const MAX_CUSTOM_TERRAIN_CATEGORIES = 50;
export const MAX_CUSTOM_SPRITES = 200;
export const MAX_CUSTOM_ORDERS = 50;

/**
 * Generous magnitude ceiling for any single numeric stat in a custom def. The
 * bound only rejects NaN/Infinity and absurd values (e.g. 1e308) that would
 * poison the simulation math.
 */
export const MAX_ABS_STAT = 1e9;

export interface CustomDefValidationError {
  scope:
    | "unitTemplate"
    | "damageType"
    | "unitFormation"
    | "unitCategory"
    | "terrainCategory"
    | "customSprite"
    | "gameConstants"
    | "gameRules"
    | "order";
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
  const customGameConstants = scenario.customGameConstants ?? {};
  const customGameRules = scenario.customGameRules ?? {};
  const customOrders = scenario.customOrders ?? {};

  const countLimits: Array<
    [number, number, CustomDefValidationError["scope"], string]
  > = [
    [customUnitTemplates.length, MAX_CUSTOM_UNIT_TEMPLATES, "unitTemplate", "unit templates"],
    [customDamageTypes.length, MAX_CUSTOM_DAMAGE_TYPES, "damageType", "damage types"],
    [customUnitFormations.length, MAX_CUSTOM_UNIT_FORMATIONS, "unitFormation", "unit formations"],
    [customUnitCategories.length, MAX_CUSTOM_UNIT_CATEGORIES, "unitCategory", "unit categories"],
    [customTerrainCategories.length, MAX_CUSTOM_TERRAIN_CATEGORIES, "terrainCategory", "terrain categories"],
    [Object.keys(customSprites).length, MAX_CUSTOM_SPRITES, "customSprite", "sprites"],
    [Object.keys(customOrders).length, MAX_CUSTOM_ORDERS, "order", "order overrides"],
  ];
  for (const [count, max, scope, label] of countLimits) {
    if (count > max) {
      errors.push({ scope, message: `Too many custom ${label}: ${count} (max ${max})` });
    }
  }

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
  errors.push(...validateGameConstantOverrides(customGameConstants));
  errors.push(...validateGameRuleOverrides(customGameRules));
  errors.push(...validateCustomOrders(customOrders, eraGameDataManager));

  return errors;
}

/**
 * Validates the sparse per-order overrides. Each key must name an existing era
 * order (overrides modify built-ins; they cannot add new order types), the
 * identity fields `id`/`name` must not be changed (they key the runtime
 * lookups), and every numeric leaf must be in range.
 */
function validateCustomOrders(
  customOrders: Partial<Record<OrderType, DeepPartial<OrderTemplate>>>,
  eraGameDataManager: GameDataManager,
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];
  const knownIds = new Set<number>(eraGameDataManager.getOrderTypes());

  for (const [idStr, override] of Object.entries(customOrders)) {
    const id = Number(idStr);
    if (!Number.isInteger(id) || !knownIds.has(id)) {
      errors.push({
        scope: "order",
        field: idStr,
        message: `Order id "${idStr}" is not a known order for this era; only existing orders can be overridden`,
      });
      continue;
    }
    if (!override || typeof override !== "object") {
      errors.push({
        scope: "order",
        field: idStr,
        message: `Order override "${idStr}" must be an object`,
      });
      continue;
    }
    const eraName = eraGameDataManager.getOrderTemplate(id).name;
    if (override.id !== undefined && override.id !== id) {
      errors.push({
        scope: "order",
        field: idStr,
        message: `Order override "${idStr}" must not change the order id`,
      });
    }
    if (override.name !== undefined && override.name !== eraName) {
      errors.push({
        scope: "order",
        field: idStr,
        message: `Order override "${idStr}" must not change the order name`,
      });
    }
    for (const message of findOutOfRangeNumbers(override, "")) {
      errors.push({ scope: "order", field: idStr, message });
    }
  }

  return errors;
}

function validateCustomTerrainCategories(
  customTerrainCategories: CustomTerrainCategoryOverride[],
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];
  const seenIds = new Set<string>();

  for (const override of customTerrainCategories) {
    if (typeof override.id !== "string" || override.id.trim() === "") {
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

    for (const message of findOutOfRangeNumbers(override, "")) {
      errors.push({ scope: "terrainCategory", field: override.id, message });
    }
  }

  return errors;
}

/**
 * Returns a message for every numeric field in a custom def that is not finite
 * or exceeds MAX_ABS_STAT in magnitude. Walks nested objects/arrays (a
 * template's formations, a damage type's ranges, etc.); JSON inputs are acyclic
 * and size-capped upstream, so the recursion is bounded.
 */
function findOutOfRangeNumbers(value: unknown, path: string): string[] {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return [`${path} must be a finite number`];
    if (Math.abs(value) > MAX_ABS_STAT) {
      return [`${path} exceeds the max allowed magnitude (${MAX_ABS_STAT})`];
    }
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, i) =>
      findOutOfRangeNumbers(item, `${path}[${i}]`),
    );
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, val]) =>
      findOutOfRangeNumbers(val, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

/**
 * Game constants whose value drives tick/grid/divisor math; a zero or negative
 * value crashes the editor preview and the sim. Every other constant stays
 * freely editable (only NaN/Infinity/absurd magnitudes are rejected).
 */
const POSITIVE_GAME_CONSTANT_KEYS: Array<keyof GameConstants> = [
  "TILE_SIZE",
  "TICKS_PER_TURN",
  "STAT_DISPLAY_DIVISOR",
  "COLLISION_DETECTION_SUBTICKS",
  "DEFAULT_MAP_WIDTH",
  "DEFAULT_MAP_HEIGHT",
];

function validateGameConstantOverrides(
  customGameConstants: Partial<GameConstants>,
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];
  for (const message of findOutOfRangeNumbers(customGameConstants, "")) {
    errors.push({ scope: "gameConstants", message });
  }
  for (const key of POSITIVE_GAME_CONSTANT_KEYS) {
    const value = customGameConstants[key];
    if (value !== undefined && (typeof value !== "number" || value <= 0)) {
      errors.push({
        scope: "gameConstants",
        field: key,
        message: `${key} must be a positive number`,
      });
    }
  }
  return errors;
}

function validateGameRuleOverrides(
  customGameRules: DeepPartial<GameRules>,
): CustomDefValidationError[] {
  return findOutOfRangeNumbers(customGameRules, "").map((message) => ({
    scope: "gameRules" as const,
    message,
  }));
}

function validateCustomDamageTypes(
  customDamageTypes: DamageTypeTemplate[],
  eraGameDataManager: GameDataManager,
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];
  const seenIds = new Set<number>();
  const seenNames = new Set<string>();
  const builtInDamageTypes = eraGameDataManager.getDamageTypes();
  const builtInById = new Map(builtInDamageTypes.map((dt) => [dt.id, dt]));
  const builtInByName = new Map(builtInDamageTypes.map((dt) => [dt.name, dt]));

  for (const dt of customDamageTypes) {
    if (typeof dt.id !== "number" || Number.isNaN(dt.id)) {
      errors.push({
        scope: "damageType",
        field: dt.name,
        message: "Damage type id is required",
      });
      continue;
    }
    if (typeof dt.name !== "string" || dt.name.trim() === "") {
      errors.push({
        scope: "damageType",
        message: "Damage type name is required",
      });
      continue;
    }
    // Lookup at runtime is by name; id+name must move together (full
    // override of a built-in, or fully unique) to keep the name->dt map
    // consistent.
    const builtInForId = builtInById.get(dt.id);
    if (builtInForId && builtInForId.name !== dt.name) {
      errors.push({
        scope: "damageType",
        field: dt.name,
        message: `Custom damage type with id ${dt.id} renames built-in "${builtInForId.name}" to "${dt.name}"; keep the original name when overriding so existing unit templates still resolve.`,
      });
    }
    const builtInForName = builtInByName.get(dt.name);
    if (builtInForName && builtInForName.id !== dt.id) {
      errors.push({
        scope: "damageType",
        field: dt.name,
        message: `Damage type name "${dt.name}" already belongs to built-in id ${builtInForName.id}; set id to ${builtInForName.id} to override that built-in, or pick a different name.`,
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
    if (dt.ranged === true && (dt.ranges?.length ?? 0) === 0) {
      errors.push({
        scope: "damageType",
        field: dt.name,
        message: `Ranged damage type "${dt.name}" needs at least one range bracket`,
      });
    }
    // angleOffset re-centers the firing arc relative to the front; keep it
    // within a full turn so a typo can't point a battery off into nonsense.
    if (
      dt.ranged === true &&
      dt.angleOffset !== undefined &&
      (dt.angleOffset < -360 || dt.angleOffset > 360)
    ) {
      errors.push({
        scope: "damageType",
        field: dt.name,
        message: `Ranged damage type "${dt.name}" angleOffset must be between -360 and 360 degrees`,
      });
    }
    for (const message of findOutOfRangeNumbers(dt, "")) {
      errors.push({ scope: "damageType", field: dt.name, message });
    }
    seenIds.add(dt.id);
    seenNames.add(dt.name);
  }

  return errors;
}

function validateCustomUnitFormations(
  customUnitFormations: FormationTemplate[],
  _eraGameDataManager: GameDataManager,
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];
  const seenIds = new Set<string>();

  for (const formation of customUnitFormations) {
    // Built-in id collision is an explicit override (handled in loadCustomDefs).
    if (seenIds.has(formation.id)) {
      errors.push({
        scope: "unitFormation",
        field: formation.id,
        message: `Duplicate custom formation id "${formation.id}"`,
      });
    }
    seenIds.add(formation.id);

    for (const message of findOutOfRangeNumbers(formation, "")) {
      errors.push({ scope: "unitFormation", field: formation.id, message });
    }
  }

  return errors;
}

function validateCustomUnitCategories(
  customUnitCategories: UnitCategoryTemplate[],
  eraGameDataManager: GameDataManager,
): CustomDefValidationError[] {
  const errors: CustomDefValidationError[] = [];
  const seenIds = new Set<string>();
  const knownOrderNames = new Set(
    eraGameDataManager
      .getOrderTypes()
      .map((id) => eraGameDataManager.tryGetOrderTemplate(id)?.name)
      .filter((name): name is string => !!name),
  );

  for (const category of customUnitCategories) {
    if (typeof category.id !== "string" || category.id.trim() === "") {
      errors.push({
        scope: "unitCategory",
        message: "Unit category id is required",
      });
      continue;
    }
    // Built-in id collision is an explicit override (handled in loadCustomDefs).
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

    for (const message of findOutOfRangeNumbers(category, "")) {
      errors.push({ scope: "unitCategory", field: category.id, message });
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
    // Reusing a built-in `type` id is an explicit override; CUSTOM_UNIT_TYPE_MIN
    // is still the editor's default but not a validation floor.
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

    if ((template.formations?.length ?? 0) === 0) {
      errors.push({
        scope: "unitTemplate",
        field: template.name,
        message: `formations is empty — unit needs at least one formation`,
      });
    }
    for (const formation of template.formations ?? []) {
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
    const templateFormations = template.formations ?? [];
    if (
      template.defaultFormation &&
      !templateFormations.some((f) => f.id === template.defaultFormation)
    ) {
      errors.push({
        scope: "unitTemplate",
        field: template.name,
        message: `defaultFormation "${template.defaultFormation}" must match one of the unit's formations (${templateFormations.map((f) => f.id).join(", ") || "<empty>"})`,
      });
    }

    // Only runnable units read runCost/walkMovement (and NaN-freeze without them);
    // immobile units (walls, static artillery) legitimately omit them.
    if ((template.runMovement ?? 0) > 0) {
      for (const key of ["runCost", "walkMovement"] as const) {
        if (typeof template[key] !== "number") {
          errors.push({
            scope: "unitTemplate",
            field: template.name,
            message: `${key} is required for a unit that can run (runMovement > 0); a missing value freezes stamina with NaN`,
          });
        }
      }
    }

    for (const message of findOutOfRangeNumbers(template, "")) {
      errors.push({ scope: "unitTemplate", field: template.name, message });
    }
  }

  return errors;
}

/**
 * Max size of a *compressed* scenario the client lets the user import, kept as a
 * margin below the server's 200KB request-body cap (server/src/app.ts). Single
 * source of truth for the import-size limit: the editor budgets and the
 * "scenario too large" message all derive from this.
 */
export const MAX_COMPRESSED_SCENARIO_IMPORT_BYTES = 150 * 1024;

/**
 * Per-sprite byte budget for uploaded custom sprites: the editor re-encodes to
 * fit this and scenario import re-checks it server-side. Aggregate weight is
 * bounded by the per-collection count caps above and the server's
 * decompressed-payload cap (server/src/api/compress.ts).
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
    for (const formation of template.formations ?? []) {
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
