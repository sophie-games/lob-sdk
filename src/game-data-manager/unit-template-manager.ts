import { UnitFormationTemplate, UnitTemplate, UnitType,  } from "@lob-sdk/types"

export class UnitTemplateManager {
  private _templates: UnitTemplate[] = [];
  private _map = new Map<UnitType, UnitTemplate>();
  private _formations = new Map<UnitType, Map<string, UnitFormationTemplate>>();

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

  getTemplate<T extends UnitTemplate = UnitTemplate>(type: UnitType): T {
    const template = this._map.get(type);

    if (!template) {
      throw new Error(`Unit template with type ${type} not found`);
    }

    return template as T;
  }

  getTemplates(): UnitTemplate[] {
    return this._templates;
  }

  getFormation(
    type: UnitType,
    formationId: string
  ): UnitFormationTemplate | null {
    return this._formations.get(type)?.get(formationId) ?? null;
  }

  getDefaultFormation(type: UnitType): UnitFormationTemplate {
    const template = this.getTemplate(type);
    return this.getFormation(type, template.defaultFormation)!;
  }

  getAvailableFormations(unitType: UnitType): UnitFormationTemplate[] {
    const template = this.getTemplate(unitType);
    return template.formations;
  }
}
