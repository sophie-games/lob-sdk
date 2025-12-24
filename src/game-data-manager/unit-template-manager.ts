import { UnitFormationTemplate, UnitTemplate, UnitType,  } from "@lob-sdk/types"

/**
 * Manages unit templates and their formations.
 * Provides efficient lookup of unit templates and formation configurations.
 */
export class UnitTemplateManager {
  private _templates: UnitTemplate[] = [];
  private _map = new Map<UnitType, UnitTemplate>();
  private _formations = new Map<UnitType, Map<string, UnitFormationTemplate>>();

  /**
   * Loads unit templates into the manager.
   * @param templates - An array of unit templates to load.
   */
  load(templates: UnitTemplate[]) {
    this._templates = templates;

    for (const template of templates) {
      this._map.set(template.type, template);

      const formationMap = new Map<string, UnitFormationTemplate>();
      for (const formation of template.formations) {
        formationMap.set(formation.id, formation);
      }

      this._formations.set(template.type, formationMap);
    }
  }

  /**
   * Gets a unit template by type.
   * @param type - The unit type ID.
   * @returns The unit template.
   * @throws Error if the template is not found.
   * @template T - The specific unit template type to return.
   */
  getTemplate<T extends UnitTemplate = UnitTemplate>(type: UnitType): T {
    const template = this._map.get(type);

    if (!template) {
      throw new Error(`Unit template with type ${type} not found`);
    }

    return template as T;
  }

  /**
   * Gets all unit templates.
   * @returns An array of all unit templates.
   */
  getTemplates(): UnitTemplate[] {
    return this._templates;
  }

  /**
   * Gets a formation template for a specific unit type and formation ID.
   * @param type - The unit type ID.
   * @param formationId - The formation ID.
   * @returns The formation template, or null if not found.
   */
  getFormation(
    type: UnitType,
    formationId: string
  ): UnitFormationTemplate | null {
    return this._formations.get(type)?.get(formationId) ?? null;
  }

  /**
   * Gets the default formation for a unit type.
   * @param type - The unit type ID.
   * @returns The default formation template.
   */
  getDefaultFormation(type: UnitType): UnitFormationTemplate {
    const template = this.getTemplate(type);
    return this.getFormation(type, template.defaultFormation)!;
  }

  /**
   * Gets all available formations for a unit type.
   * @param unitType - The unit type ID.
   * @returns An array of available formation templates.
   */
  getAvailableFormations(unitType: UnitType): UnitFormationTemplate[] {
    const template = this.getTemplate(unitType);
    return template.formations;
  }
}
