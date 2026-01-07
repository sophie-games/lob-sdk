import {
  UnitTemplate,
  UnitType,
  UnitCategoryId,
  RangeUnitTemplate,
  GameScenario,
  ScenarioName,
  BattleTypeTemplate,
  DynamicBattleType,
  TerrainCategoryType,
  TerrainCategoryConfig,
  TerrainType,
  TerrainConfig,
  Size,
} from "@lob-sdk/types";
import {
  GameConstants,
  GameEra,
  UnitCategoryTemplate,
  DamageTypeTemplate,
  GameRules,
  RangedDamageTypeTemplate,
  UnitSkin,
  ObjectiveSkin,
  Avatar,
  MapSizeTemplate,
} from "./types";

// Import all era-specific data synchronously
import napoleonicBattleTypes from "@lob-sdk/game-data/eras/napoleonic/battle-types.json";
import napoleonicOrders from "@lob-sdk/game-data/eras/napoleonic/orders.json";
import napoleonicUnitTemplates from "@lob-sdk/game-data/eras/napoleonic/unit-templates.json";
import napoleonicGameConstants from "@lob-sdk/game-data/eras/napoleonic/game-constants.json";
import napoleonicAvatars from "@lob-sdk/game-data/eras/napoleonic/avatars.json";
import napoleonicDamageTypes from "@lob-sdk/game-data/eras/napoleonic/damage-types.json";
import napoleonicTerrains from "@lob-sdk/game-data/eras/napoleonic/terrains.json";
import napoleonicTerrainCategories from "@lob-sdk/game-data/eras/napoleonic/terrain-categories.json";
import napoleonicObjectiveSkins from "@lob-sdk/game-data/eras/napoleonic/objective-skins.json";
import napoleonicUnitCategories from "@lob-sdk/game-data/eras/napoleonic/unit-categories.json";
import napoleonicUnitSkinsData from "@lob-sdk/game-data/eras/napoleonic/unit-skins.json";
import napoleonicGameRules from "@lob-sdk/game-data/eras/napoleonic/game-rules.json";
import napoleonicFormations from "@lob-sdk/game-data/eras/napoleonic/formations.json";
import napoleonicMapSizes from "@lob-sdk/game-data/eras/napoleonic/map-sizes.json";

// Import napoleonic scenarios
import napoleonicWaterloo from "@lob-sdk/game-data/eras/napoleonic/scenarios/waterloo.json";
import napoleonicHills from "@lob-sdk/game-data/eras/napoleonic/scenarios/hills.json";
import napoleonicPlains from "@lob-sdk/game-data/eras/napoleonic/scenarios/plains.json";
import napoleonicCity from "@lob-sdk/game-data/eras/napoleonic/scenarios/city.json";
import napoleonicFauconRiverValley from "@lob-sdk/game-data/eras/napoleonic/scenarios/faucon-river-valley.json";
import napoleonicSaandLakes from "@lob-sdk/game-data/eras/napoleonic/scenarios/saand-lakes.json";
import napoleonicAmnisNucum from "@lob-sdk/game-data/eras/napoleonic/scenarios/amnis-nucum.json";
import napoleonicCittaDeiFalchi from "@lob-sdk/game-data/eras/napoleonic/scenarios/citta-dei-falchi.json";
import napoleonicRoadToAmnisNucum from "@lob-sdk/game-data/eras/napoleonic/scenarios/road-to-amnis-nucum.json";
import napoleonicRuralAlpine from "@lob-sdk/game-data/eras/napoleonic/scenarios/rural-alpine.json";
import napoleonicFalkenhugel from "@lob-sdk/game-data/eras/napoleonic/scenarios/falkenhugel.json";
import napoleonicGrobesSchlachtfeld from "@lob-sdk/game-data/eras/napoleonic/scenarios/grobes-schlachtfeld.json";
import napoleonicMediterraneaNucum from "@lob-sdk/game-data/eras/napoleonic/scenarios/mediterranea-nucum.json";
import napoleonicRiverValley from "@lob-sdk/game-data/eras/napoleonic/scenarios/river-valley.json";
import napoleonicLinesOfLegends from "@lob-sdk/game-data/eras/napoleonic/scenarios/lines-of-legends.json";
import napoleonicAestateVillas from "@lob-sdk/game-data/eras/napoleonic/scenarios/aestate-villas.json";
import napoleonicBorodino from "@lob-sdk/game-data/eras/napoleonic/scenarios/borodino.json";
import napoleonicCombatAtMollwitz from "@lob-sdk/game-data/eras/napoleonic/scenarios/combat-at-mollwitz.json";
import napoleonicClashAtChelmnitz from "@lob-sdk/game-data/eras/napoleonic/scenarios/clash-at-chelmnitz.json";
import napoleonicTundra from "@lob-sdk/game-data/eras/napoleonic/scenarios/tundra.json";
import napoleonicDresden from "@lob-sdk/game-data/eras/napoleonic/scenarios/dresden.json";
import napoleonicBlackForest from "@lob-sdk/game-data/eras/napoleonic/scenarios/black-forest.json";
import napoleonicLake from "@lob-sdk/game-data/eras/napoleonic/scenarios/lake.json";
import napoleonicAntioch from "@lob-sdk/game-data/eras/napoleonic/scenarios/antioch.json";
import napoleonicClassicPlains from "@lob-sdk/game-data/eras/napoleonic/scenarios/classic-plains.json";
import napoleonicClassicHills from "@lob-sdk/game-data/eras/napoleonic/scenarios/classic-hills.json";
import napoleonicClassicTundra from "@lob-sdk/game-data/eras/napoleonic/scenarios/classic-tundra.json";
import napoleonicSilvaSanctorum from "@lob-sdk/game-data/eras/napoleonic/scenarios/silva-sanctorum.json";
import napoleonicAndesAndValley from "@lob-sdk/game-data/eras/napoleonic/scenarios/andes-and-valley.json";
import napoleonicLowCountries from "@lob-sdk/game-data/eras/napoleonic/scenarios/low-countries.json";
import napoleonicHedgerows from "@lob-sdk/game-data/eras/napoleonic/scenarios/hedgerows.json";
import napoleonicTutorialBasicControls from "@lob-sdk/game-data/eras/napoleonic/scenarios/tutorial-basic-controls.json";
import napoleonicTutorialControlGroups from "@lob-sdk/game-data/eras/napoleonic/scenarios/tutorial-control-groups.json";
import napoleonicTutorialInfantryFormations from "@lob-sdk/game-data/eras/napoleonic/scenarios/tutorial-infantry-formations.json";
import napoleonicTutorialUnitManagement from "@lob-sdk/game-data/eras/napoleonic/scenarios/tutorial-unit-management.json";
import napoleonicTutorialCharges from "@lob-sdk/game-data/eras/napoleonic/scenarios/tutorial-charges.json";
import napoleonicTutorialHoldFire from "@lob-sdk/game-data/eras/napoleonic/scenarios/tutorial-hold-fire.json";

import ww2BattleTypes from "@lob-sdk/game-data/eras/ww2/battle-types.json";
import ww2Orders from "@lob-sdk/game-data/eras/ww2/orders.json";
import ww2UnitTemplates from "@lob-sdk/game-data/eras/ww2/unit-templates.json";
import ww2GameConstants from "@lob-sdk/game-data/eras/ww2/game-constants.json";
import ww2Avatars from "@lob-sdk/game-data/eras/ww2/avatars.json";
import ww2DamageTypes from "@lob-sdk/game-data/eras/ww2/damage-types.json";
import ww2Terrains from "@lob-sdk/game-data/eras/ww2/terrains.json";
import ww2TerrainCategories from "@lob-sdk/game-data/eras/ww2/terrain-categories.json";
import ww2ObjectiveSkins from "@lob-sdk/game-data/eras/ww2/objective-skins.json";
import ww2UnitCategories from "@lob-sdk/game-data/eras/ww2/unit-categories.json";
import ww2UnitSkins from "@lob-sdk/game-data/eras/ww2/unit-skins.json";
import ww2GameRules from "@lob-sdk/game-data/eras/ww2/game-rules.json";
import ww2Formations from "@lob-sdk/game-data/eras/ww2/formations.json";
import ww2MapSizes from "@lob-sdk/game-data/eras/ww2/map-sizes.json";

// Import ww2 scenarios
import ww2BattleOfMoscow from "@lob-sdk/game-data/eras/ww2/scenarios/battle-of-moscow.json";
import ww2Fields from "@lob-sdk/game-data/eras/ww2/scenarios/fields.json";
import ww2France from "@lob-sdk/game-data/eras/ww2/scenarios/battle-of-france.json";

// Shared
import gameConstantCategories from "@lob-sdk/game-data/shared/game-constant-categories.json";
import { FormationTemplate, OrderTemplate, OrderType } from "@lob-sdk/types";
import { FormationManager } from "./formation-manager";
import { UnitTemplateManager } from "./unit-template-manager";
import { degreesToRadians } from "@lob-sdk/utils";

/**
 * Centralized lazy-loading game data manager.
 * Provides access to all game data including units, formations, terrains, battle types, and more.
 * Uses a singleton pattern per era to ensure efficient memory usage.
 */
export class GameDataManager {
  readonly era: GameEra;
  private static instances: Map<GameEra, GameDataManager> = new Map();

  // Centralized data cache
  private battleTypes: Record<DynamicBattleType, BattleTypeTemplate> =
    {} as Record<DynamicBattleType, BattleTypeTemplate>;

  // Unit templates
  private _unitTemplateManager = new UnitTemplateManager();

  // Unit categories
  private unitCategories: UnitCategoryTemplate[] = [];
  private unitCategoryMap: Map<UnitCategoryId, UnitCategoryTemplate> =
    new Map();

  // Game constants
  private gameConstants: GameConstants | null = null;

  // Game constant categories
  private gameConstantCategories: Record<string, string> = {};

  // Avatars
  private avatars: Avatar[] = [];
  private avatarMap: Map<number, Avatar> = new Map();

  // Damage types
  private damageTypes: DamageTypeTemplate[] = [];
  private _damageTypeMap = new Map<number, DamageTypeTemplate>();
  private _damageTypeNameMap = new Map<string, DamageTypeTemplate>();
  private _chargeRestrictionsCache: Map<string, Set<UnitCategoryId>> | null =
    null;

  // Terrains
  private terrains: TerrainConfig[] = [];
  private terrainMap: Map<TerrainType, TerrainConfig> = new Map();

  // Terrain categories
  private terrainCategories: Record<
    TerrainCategoryType,
    TerrainCategoryConfig
  > | null = null;

  // Objective skins
  private objectiveSkins: ObjectiveSkin[] = [];
  private objectiveSkinMap: Map<number, ObjectiveSkin> = new Map();

  // Unit skins
  private unitSkins: UnitSkin[] = [];
  private unitSkinMap: Map<number, UnitSkin> = new Map();

  // Game rules
  private gameRules: GameRules | null = null;

  // Formations
  private _formationManager = new FormationManager();

  // Scenarios
  private scenarios: Record<ScenarioName, GameScenario> = {};

  // Map sizes
  private mapSizes: Record<Size, MapSizeTemplate> | null = null;

  private _unitCategoryAllowedOrders: Map<UnitCategoryId, Set<OrderType>> =
    new Map();

  private _orders: OrderTemplate[] = [];
  private _orderMap: Map<OrderType, OrderTemplate> = new Map();
  private _orderNameMap: Map<string, OrderType> = new Map();

  private _headOnCollisionCosineThresholdSquared: number = -1;

  /**
   * Gets or creates a GameDataManager instance for the specified era.
   * Uses a singleton pattern to ensure only one instance exists per era.
   * @param era - The game era ("napoleonic" or "ww2").
   * @returns The GameDataManager instance for the era.
   */
  public static get(era: GameEra): GameDataManager {
    if (!GameDataManager.instances.has(era)) {
      const instance = new GameDataManager(era);

      GameDataManager.instances.set(era, instance);
    }
    return GameDataManager.instances.get(era)!;
  }

  /**
   * Clears all cached GameDataManager instances.
   * Useful for testing or memory management.
   */
  static clear() {
    GameDataManager.instances.clear();
  }

  /**
   * Creates a new GameDataManager instance for the specified era.
   * Private constructor to enforce singleton pattern via get() method.
   * @param era - The game era ("napoleonic" or "ww2").
   */
  private constructor(era: GameEra) {
    this.era = era;
    this.loadEraData(era);

    // Initialize shared data that doesn't depend on era
    this.gameConstantCategories = gameConstantCategories;
  }

  /**
   * Load all era-specific data synchronously
   */
  private loadEraData(era: GameEra): void {
    // Load data based on era
    switch (era) {
      case "napoleonic":
        this._orders = napoleonicOrders as OrderTemplate[];
        this.battleTypes = napoleonicBattleTypes as Record<
          DynamicBattleType,
          BattleTypeTemplate
        >;
        this._unitTemplateManager.load(
          napoleonicUnitTemplates as UnitTemplate[]
        );
        this.gameConstants = napoleonicGameConstants as GameConstants;
        this.avatars = napoleonicAvatars as Avatar[];
        this.damageTypes = napoleonicDamageTypes as DamageTypeTemplate[];
        this.terrains = napoleonicTerrains as GameDataManager["terrains"];
        this.terrainCategories = napoleonicTerrainCategories as Record<
          TerrainCategoryType,
          TerrainCategoryConfig
        > as GameDataManager["terrainCategories"];
        this.objectiveSkins = napoleonicObjectiveSkins as ObjectiveSkin[];
        this.unitCategories =
          napoleonicUnitCategories as UnitCategoryTemplate[];
        this.unitSkins = napoleonicUnitSkinsData as unknown as UnitSkin[];
        this.gameRules = napoleonicGameRules as GameRules;
        this._formationManager.load(
          napoleonicFormations as FormationTemplate[]
        );
        this.mapSizes = napoleonicMapSizes as Record<Size, MapSizeTemplate>;
        this.scenarios = {
          plains: napoleonicPlains as GameScenario,
          hills: napoleonicHills as GameScenario,
          city: napoleonicCity as GameScenario,
          hedgerows: napoleonicHedgerows as GameScenario,
          "low-countries": napoleonicLowCountries as GameScenario,
          lake: napoleonicLake as GameScenario,
          tundra: napoleonicTundra as GameScenario,
          "black-forest": napoleonicBlackForest as GameScenario,
          "classic-plains": napoleonicClassicPlains as GameScenario,
          "classic-hills": napoleonicClassicHills as GameScenario,
          "classic-tundra": napoleonicClassicTundra as GameScenario,
          "silva-sanctorum": napoleonicSilvaSanctorum as GameScenario,
          "andes-and-valley": napoleonicAndesAndValley as GameScenario,
          "lines-of-legends": napoleonicLinesOfLegends as GameScenario,
          "river-valley": napoleonicRiverValley as GameScenario,
          "saand-lakes": napoleonicSaandLakes as GameScenario,
          "faucon-river-valley": napoleonicFauconRiverValley as GameScenario,
          "amnis-nucum": napoleonicAmnisNucum as GameScenario,
          "road-to-amnis-nucum": napoleonicRoadToAmnisNucum as GameScenario,
          "aestate-villas": napoleonicAestateVillas as GameScenario,
          "citta-dei-falchi": napoleonicCittaDeiFalchi as GameScenario,
          "rural-alpine": napoleonicRuralAlpine as GameScenario,
          "mediterranea-nucum": napoleonicMediterraneaNucum as GameScenario,
          falkenhugel: napoleonicFalkenhugel as GameScenario,
          "grobes-schlachtfeld": napoleonicGrobesSchlachtfeld as GameScenario,
          antioch: napoleonicAntioch as GameScenario,
          waterloo: napoleonicWaterloo as GameScenario,
          borodino: napoleonicBorodino as GameScenario,
          "combat-at-mollwitz": napoleonicCombatAtMollwitz as GameScenario,
          "clash-at-chelmnitz": napoleonicClashAtChelmnitz as GameScenario,
          dresden: napoleonicDresden as GameScenario,
          "tutorial-basic-controls":
            napoleonicTutorialBasicControls as GameScenario,
          "tutorial-control-groups":
            napoleonicTutorialControlGroups as GameScenario,
          "tutorial-infantry-formations":
            napoleonicTutorialInfantryFormations as GameScenario,
          "tutorial-unit-management":
            napoleonicTutorialUnitManagement as GameScenario,
          "tutorial-charges": napoleonicTutorialCharges as GameScenario,
          "tutorial-hold-fire": napoleonicTutorialHoldFire as GameScenario,
        };

        break;
      case "ww2":
        this._orders = ww2Orders as OrderTemplate[];
        this.battleTypes = ww2BattleTypes as Record<
          DynamicBattleType,
          BattleTypeTemplate
        >;
        this._unitTemplateManager.load(
          ww2UnitTemplates as unknown as UnitTemplate[]
        );
        this.gameConstants = ww2GameConstants as GameConstants;
        this.avatars = ww2Avatars as Avatar[];
        this.damageTypes = ww2DamageTypes as DamageTypeTemplate[];
        this.terrains = ww2Terrains as GameDataManager["terrains"];
        this.terrainCategories =
          ww2TerrainCategories as GameDataManager["terrainCategories"];
        this.objectiveSkins = ww2ObjectiveSkins as ObjectiveSkin[];
        this.unitCategories = ww2UnitCategories as UnitCategoryTemplate[];
        this.unitSkins = ww2UnitSkins as unknown as UnitSkin[];
        this.gameRules = ww2GameRules as GameRules;
        this._formationManager.load(ww2Formations as FormationTemplate[]);
        this.mapSizes = ww2MapSizes as Record<Size, MapSizeTemplate>;
        this.scenarios = {
          fields: ww2Fields as GameScenario,
          "battle-of-france": ww2France as GameScenario,
          "battle-of-moscow": ww2BattleOfMoscow as GameScenario,
        };

        break;
      default:
        throw new Error(`Unsupported era: ${era}`);
    }

    this._orders.forEach((order) => {
      this._orderMap.set(order.id, order);
      this._orderNameMap.set(order.name, order.id);
    });

    this.terrains.forEach((terrain) => {
      this.terrainMap.set(terrain.id, terrain);
    });

    this.unitCategories.forEach((category) => {
      this.unitCategoryMap.set(category.id, category);

      if (category.allowedOrders) {
        this._unitCategoryAllowedOrders.set(
          category.id,
          new Set(
            category.allowedOrders.map((order) => {
              const orderType = this._orderNameMap.get(order);
              if (orderType !== undefined) {
                return orderType;
              }
              throw new Error(`Order ${order} not found`);
            })
          )
        );
      }
    });

    // Build avatar map for O(1) lookup
    this.avatarMap = new Map(this.avatars.map((a) => [a.id, a]));

    this.objectiveSkins.forEach((objectiveSkin) => {
      this.objectiveSkinMap.set(objectiveSkin.id, objectiveSkin);
    });

    this.unitSkins.forEach((unitSkin) => {
      this.unitSkinMap.set(unitSkin.id, unitSkin);
    });

    // Initialize damage type mappings
    this.damageTypes.forEach((damageType) => {
      this._damageTypeMap.set(damageType.id, damageType);
      this._damageTypeNameMap.set(damageType.name, damageType);
    });
  }

  /**
   * Gets a battle type template by battle type.
   * @param battleType - The dynamic battle type.
   * @returns The battle type template.
   * @throws Error if the battle type is not found.
   */
  public getBattleType(battleType: DynamicBattleType): BattleTypeTemplate {
    const battleTypeData = this.battleTypes[battleType];

    if (!battleTypeData) {
      throw new Error(`Battle type ${battleType} not found`);
    }

    return battleTypeData;
  }

  /**
   * Tries to get a battle type template by battle type.
   * @param battleType - The dynamic battle type.
   * @returns The battle type template, or undefined if not found.
   */
  public tryGetBattleType(
    battleType: DynamicBattleType
  ): BattleTypeTemplate | undefined {
    return this.battleTypes[battleType];
  }

  /**
   * Gets the game constants for the current era.
   * @returns The game constants object.
   */
  public getGameConstants(): GameConstants {
    return this.gameConstants as GameConstants;
  }

  /**
   * Gets the game rules for the current era.
   * @returns The game rules object.
   */
  public getGameRules(): GameRules {
    return this.gameRules as GameRules;
  }

  /**
   * Gets the map sizes for the current era.
   * @returns The map sizes data.
   */
  public getMapSizes(): Record<Size, MapSizeTemplate> {
    if (!this.mapSizes) {
      throw new Error(`Map sizes not loaded for era: ${this.era}`);
    }
    return this.mapSizes;
  }

  /**
   * Gets all game constant category names.
   * @returns An array of sorted category names.
   */
  public getGameConstantCategories(): string[] {
    const categories = new Set<string>();
    Object.values(this.gameConstantCategories).forEach((category) => {
      categories.add(category);
    });
    return Array.from(categories).sort();
  }

  /**
   * Gets the category name for a game constant key.
   * @param constantKey - The constant key to look up.
   * @returns The category name, or undefined if not found.
   */
  public getGameConstantCategory(constantKey: string): string | undefined {
    return this.gameConstantCategories[constantKey];
  }

  /**
   * Gets all available avatars for the current era.
   * @returns An array of avatar objects.
   */
  public getAvatars(): Avatar[] {
    return this.avatars;
  }

  /**
   * Gets a specific avatar by ID.
   * @param avatarId - The avatar ID.
   * @returns The avatar object, or undefined if not found.
   */
  public getAvatar(avatarId?: number): Avatar | undefined {
    return this.avatarMap.get(avatarId!);
  }

  /**
   * Gets all damage type templates for the current era.
   * @returns An array of damage type templates.
   */
  public getDamageTypes(): DamageTypeTemplate[] {
    return this.damageTypes;
  }

  /**
   * Gets all terrain configurations for the current era.
   * @returns An array of terrain configurations.
   */
  public getTerrains() {
    return this.terrains!;
  }

  /**
   * Gets all terrain category configurations for the current era.
   * @returns A record mapping terrain category types to their configurations.
   */
  public getTerrainCategories() {
    return this.terrainCategories!;
  }

  /**
   * Gets all objective skins for the current era.
   * @returns An array of objective skin objects.
   */
  public getObjectiveSkins(): ObjectiveSkin[] {
    return this.objectiveSkins;
  }

  /**
   * Gets a specific objective skin by ID.
   * @param skinId - The objective skin ID.
   * @returns The objective skin object, or undefined if not found.
   */
  public getObjectiveSkin(skinId?: number): ObjectiveSkin | undefined {
    return this.objectiveSkinMap.get(skinId!);
  }

  /**
   * Gets all unit skins for the current era.
   * @returns An array of unit skin objects.
   */
  public getUnitSkins(): UnitSkin[] {
    return this.unitSkins;
  }

  /**
   * Gets a specific unit skin by ID.
   * @param skinId - The unit skin ID.
   * @returns The unit skin object, or undefined if not found.
   */
  public getUnitSkin(skinId?: number): UnitSkin | undefined {
    return this.unitSkinMap.get(skinId!);
  }

  /**
   * Gets a unit category template by category ID.
   * @param unitCategory - The unit category ID.
   * @returns The unit category template.
   * @throws Error if the category template is not found.
   */
  public getUnitCategoryTemplate(
    unitCategory: UnitCategoryId
  ): UnitCategoryTemplate {
    const template = this.unitCategoryMap.get(unitCategory);

    if (!template) {
      throw new Error(
        `Unit category template with type ${unitCategory} not found`
      );
    }

    // Provide default routing behavior if not specified
    if (!template.routingBehavior) {
      template.routingBehavior = {
        baseSpeed: "run",
        fleeWhenRouted: true,
      };
    }

    return template;
  }

  /**
   * Gets all unit category templates for the current era.
   * @returns An array of unit category templates.
   */
  public getUnitCategories(): UnitCategoryTemplate[] {
    return this.unitCategories;
  }

  /**
   * Gets the unit template manager instance.
   * @returns The UnitTemplateManager instance.
   */
  getUnitTemplateManager() {
    return this._unitTemplateManager;
  }

  /**
   * Gets the formation manager instance.
   * @returns The FormationManager instance.
   */
  public getFormationManager() {
    return this._formationManager;
  }

  public getMinMaxAmmoConsumption(
    unitType: UnitType,
    modifier: number = 0
  ): { min: number; max: number } | null {
    const { rangedDamageTypes } = this._unitTemplateManager.getTemplate(
      unitType
    ) as RangeUnitTemplate;

    if (!rangedDamageTypes) {
      return null;
    }

    let min: number | null = null;
    let max: number | null = null;

    for (const damageType of rangedDamageTypes) {
      let { ammoCost } =
        this.getDamageTypeByName<RangedDamageTypeTemplate>(damageType);
      if (ammoCost !== undefined) {
        // Apply modifier to ammo cost
        ammoCost *= 1 + modifier;

        min = Math.round(Math.min(min ?? Number.MAX_SAFE_INTEGER, ammoCost));
        max = Math.round(Math.max(max ?? Number.MIN_SAFE_INTEGER, ammoCost));
      }
    }

    if (min === null || max === null) {
      return null;
    }

    return { min, max };
  }

  /**
   * Returns the physical dimensions of a unit in the given formation.
   * Dimensions are calculated from collision shapes.
   */
  public getUnitDimensions(
    unitType: UnitType,
    formationId?: string
  ): {
    width: number;
    height: number;
  } {
    const template = this._unitTemplateManager.getTemplate(unitType);

    formationId = formationId ?? template.defaultFormation;

    // Get dimensions from formation template
    const formationTemplate = this._formationManager.getTemplate(formationId);
    if (formationTemplate) {
      const collisionCircles = formationTemplate.collisionCircles;
      const collisionCircleSize = formationTemplate.collisionCircleSize;
      const collisionCircleDistance =
        formationTemplate.collisionCircleDistance ?? collisionCircleSize;
      const collisionCirclesVertical =
        formationTemplate.collisionCirclesVertical ?? false;

      // Calculate the span of all collision circles
      const span =
        collisionCircles > 1
          ? (collisionCircles - 1) * collisionCircleDistance +
            collisionCircleSize
          : collisionCircleSize;

      if (collisionCirclesVertical) {
        return {
          width: span,
          height: collisionCircleSize,
        };
      }
      return {
        width: collisionCircleSize,
        height: span,
      };
    }
    // Fallback
    return { width: 32, height: 32 };
  }

  public getUnitBaseTexture(unitType: UnitType): string {
    const template = this._unitTemplateManager.getTemplate(unitType);
    // Get sprite from default formation
    const defaultFormation = template.formations.find(
      (f) => f.id === template.defaultFormation
    );
    if (defaultFormation) {
      return defaultFormation.baseSprite;
    }
    // Fallback
    return "unknown";
  }

  public getUnitOverlayTexture(unitType: UnitType): string | null {
    const template = this._unitTemplateManager.getTemplate(unitType);
    // Get sprite from default formation
    const defaultFormation = template.formations.find(
      (f) => f.id === template.defaultFormation
    );
    if (defaultFormation) {
      return defaultFormation.overlaySprite || null;
    }
    // Fallback
    return null;
  }

  /**
   * Get all available eras
   */
  static getAvailableEras(): GameEra[] {
    return ["napoleonic", "ww2"];
  }

  // Damage type methods (moved from DamageTypeService)

  private get chargeRestrictionsCache(): Map<string, Set<UnitCategoryId>> {
    if (!this._chargeRestrictionsCache) {
      this._chargeRestrictionsCache = new Map();
    }
    return this._chargeRestrictionsCache;
  }

  /**
   * Get damage type template by type
   */
  public getDamageTypeById<T extends DamageTypeTemplate>(id: number): T {
    const template = this._damageTypeMap.get(id);
    if (!template) {
      throw new Error(`Damage type with id ${id} not found`);
    }
    return template as T;
  }

  /**
   * Get damage type template by type
   */
  public getDamageTypeByName<T extends DamageTypeTemplate>(name: string): T {
    const template = this._damageTypeNameMap.get(name);
    if (!template) {
      throw new Error(`Damage type with name ${name} not found`);
    }
    return template as T;
  }

  /**
   * Get unit category resistance for a damage type
   */
  public getUnitCategoryResistance(
    unitCategory: UnitCategoryId,
    damageType: string
  ): number {
    return (
      this.getUnitCategoryTemplate(unitCategory).damageTypeResistances?.[
        damageType
      ] ?? 0
    );
  }

  public getUnitCategoryAllowedOrders(
    unitCategory: UnitCategoryId
  ): Array<OrderType> {
    return Array.from(this._unitCategoryAllowedOrders.get(unitCategory) ?? []);
  }

  public canUseOrder(
    unitCategory: UnitCategoryId,
    orderType: OrderType
  ): boolean {
    return (
      this._unitCategoryAllowedOrders.get(unitCategory)?.has(orderType) ?? false
    );
  }

  /**
   * Get charge restrictions for a damage type (O(1) lookup with lazy initialization)
   */
  public getChargeRestrictions(
    damageType: string
  ): Set<UnitCategoryId> | undefined {
    // Check cache first
    if (this.chargeRestrictionsCache.has(damageType)) {
      return this.chargeRestrictionsCache.get(damageType);
    }

    // Get the damage type config
    const damageTypeConfig = this.getDamageTypeByName(damageType);

    // Only melee damage types can have charge restrictions
    if (
      !damageTypeConfig.ranged &&
      (damageTypeConfig as any).cannotChargeAgainst
    ) {
      const restrictions = new Set(
        (damageTypeConfig as any).cannotChargeAgainst as UnitCategoryId[]
      );
      this.chargeRestrictionsCache.set(damageType, restrictions);
      return restrictions;
    }

    // Cache undefined for damage types without restrictions
    this.chargeRestrictionsCache.set(damageType, undefined as any);
    return undefined;
  }

  /**
   * Convert damage type to numeric value
   */
  public damageTypeNameToId(type: string): number {
    const template = this._damageTypeNameMap.get(type);
    if (!template) {
      throw new Error(`Damage type with name ${type} not found`);
    }
    return template.id;
  }

  /**
   * Convert numeric value to damage type
   */
  public damageTypeIdToName(id: number): string {
    const template = this._damageTypeMap.get(id);
    if (!template) {
      throw new Error(`Damage type with id ${id} not found`);
    }
    return template.name;
  }

  /**
   * Get terrain category by terrain type
   */
  public getCategoryByTerrain(terrainType: TerrainType): TerrainCategoryType {
    const terrain = this.terrainMap.get(terrainType);
    return terrain?.category ?? TerrainCategoryType.Land;
  }

  /**
   * Get unit terrain attack modifier
   */
  public getUnitTerrainAttackModifier(
    unitCategory: UnitCategoryId,
    terrainType: TerrainType
  ): number {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.attackModifier?.[unitCategory] ?? 0;
  }

  /**
   * Get unit terrain defense modifier
   */
  public getUnitTerrainDefenseModifier(
    unitCategory: UnitCategoryId,
    terrainType: TerrainType
  ): number {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.defenseModifier?.[unitCategory] ?? 0;
  }

  /**
   * Get terrain projectile absorption
   */
  public getTerrainProjectileAbsorption(
    terrainType: TerrainType | null,
    damageType: string
  ): number {
    if (terrainType === null) {
      return 0;
    }

    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.projectileAbsorption?.[damageType] ?? 0;
  }

  /**
   * Get movement modifier for terrain and unit category
   */
  public getMovementModifier(
    terrainType: TerrainType,
    unitCategory: UnitCategoryId
  ): number {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.movementModifier?.[unitCategory] ?? 0;
  }

  /**
   * Check if a terrain category has the prioritizeMovement flag
   */
  public hasPrioritizeMovement(terrainType: TerrainType): boolean {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.prioritizeMovement ?? false;
  }

  /**
   * Check if a terrain category has the supplyRoute flag
   */
  public hasSupplyRoute(terrainType: TerrainType): boolean {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.supplyRoute ?? false;
  }

  /**
   * Get terrain hitbox height
   */
  public getTerrainHitboxHeight(terrainType: TerrainType | null): number {
    if (terrainType === null) {
      return 0;
    }

    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.hitboxHeight ?? 0;
  }

  /**
   * Get ranged attack modifier for terrain and unit category
   */
  public getRangedAttackModifier(
    terrainType: TerrainType,
    unitCategory: UnitCategoryId
  ): number {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.rangedAttackModifier?.[unitCategory] ?? 0;
  }

  /**
   * Check if objectives can be placed on terrain
   */
  public canPlaceObjectives(terrainType: TerrainType): boolean {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return !!terrainCategory?.canPlaceObjectives;
  }

  /**
   * Check if terrain is passable
   */
  public isPassable(terrainType: TerrainType): boolean {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return !terrainCategory?.impassable;
  }

  /**
   * Get stamina cost for terrain
   */
  public getStaminaCost(terrainType: TerrainType): number {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.staminaCostModifier ?? 0;
  }

  /**
   * Get push strength modifier for terrain
   */
  public getPushStrengthModifier(terrainType: TerrainType): number {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.pushStrengthModifier ?? 0;
  }

  /**
   * Get push distance modifier for terrain
   */
  public getPushDistanceModifier(terrainType: TerrainType): number {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.pushDistanceModifier ?? 0;
  }

  /**
   * Get charge resistance modifier for terrain and unit category
   */
  public getChargeResistanceModifier(
    unitCategory: UnitCategoryId,
    terrainType: TerrainType
  ): number {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.chargeResistanceModifier?.[unitCategory] ?? 0;
  }

  /**
   * Get charge bonus modifier for terrain and unit category
   */
  public getChargeBonusModifier(
    unitCategory: UnitCategoryId,
    terrainType: TerrainType
  ): number {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.chargeBonusModifier?.[unitCategory] ?? 0;
  }

  /**
   * Get fixed enemy collision level for terrain
   */
  public getFixedEnemyCollisionLevel(
    terrainType: TerrainType
  ): number | undefined {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.fixedEnemyCollisionLevel;
  }

  /**
   * Get terrain height offset
   */
  public getTerrainHeightOffset(terrainType: TerrainType): number {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.heightOffset ?? 0;
  }

  /**
   * Get vision absorption for terrain
   */
  public getVisionAbsorption(terrainType: TerrainType): number {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.visionAbsorption ?? 1;
  }

  /**
   * Get terrain color
   */
  public getTerrainColor(terrainType: TerrainType): string | undefined {
    const category = this.getCategoryByTerrain(terrainType);
    const terrainCategory = this.terrainCategories![category];
    return terrainCategory?.color;
  }

  public tryGetOrderTemplate(orderId: OrderType | null): OrderTemplate | null {
    return this._orderMap.get(orderId!) ?? null;
  }

  public getOrderTemplate(orderId: OrderType): OrderTemplate {
    return this._orderMap.get(orderId)!;
  }

  /**
   * Get a scenario by name
   */
  public getScenario<T extends GameScenario>(scenarioName: ScenarioName): T {
    const scenario = this.scenarios[scenarioName];
    if (!scenario) {
      throw new Error(`Scenario ${scenarioName} not found for era ${this.era}`);
    }
    return scenario as T;
  }

  /**
   * Try to get a scenario by name
   */
  public tryGetScenario<T extends GameScenario>(
    scenarioName: ScenarioName
  ): T | null {
    const scenario = this.scenarios[scenarioName];
    return (scenario ?? null) as T | null;
  }

  public getScenarios(): Array<ScenarioName> {
    return Object.keys(this.scenarios).filter((scenarioName) => {
      const scenario = this.scenarios[scenarioName];
      return !scenario.hidden;
    });
  }

  /**
   * Get all scenario names for this era
   */
  public getScenarioNames(): ScenarioName[] {
    return Object.keys(this.scenarios);
  }

  /**
   * Gets the squared cosine threshold for determining head-on collisions.
   *
   * This value is computed from `HEAD_ON_COLLISION_ANGLE_DEGREES` and represents
   * the squared cosine of the maximum angle (in degrees) between a unit's movement
   * direction and the direction toward another unit for the collision to be
   * considered "head-on".
   *
   * Used in collision detection to determine collision response:
   * - If head-on: Unit velocity is reset to move directly away from collision point,
   *   preventing units from moving through each other
   * - If not head-on: No collision response (units can pass through each other)
   *
   * The squared form is used to avoid computing square roots in the collision
   * detection algorithm, which compares `dot * dot` against
   * `threshold² * movMagSq * dirMagSq`.
   *
   * The value is lazily computed and cached for performance.
   *
   * @returns The squared cosine of the head-on collision angle threshold
   */
  getHeadOnCollisionCosineThresholdSquared(): number {
    if (this._headOnCollisionCosineThresholdSquared !== -1) {
      return this._headOnCollisionCosineThresholdSquared;
    }

    const value =
      Math.cos(
        degreesToRadians(this.gameConstants!.HEAD_ON_COLLISION_ANGLE_DEGREES)
      ) ** 2;

    this._headOnCollisionCosineThresholdSquared = value;

    return value;
  }

  getAllDynamicBattleTypes = (): DynamicBattleType[] => {
    return Object.keys(this.battleTypes);
  };

  getBot() {}
}
