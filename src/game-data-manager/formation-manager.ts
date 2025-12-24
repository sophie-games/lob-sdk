import { FormationTemplate } from "@lob-sdk/types"
import { DamageTypeName } from "@lob-sdk/game-data-manager";

/**
 * Handles formations and friendly fire immune damage types.
 * Manages formation templates and tracks which damage types are immune to friendly fire for each formation.
 */
export class FormationManager {
  private _formationMap: Map<string, FormationTemplate> = new Map();
  private _friendlyFireImmuneDamageTypes: Map<string, Set<DamageTypeName>> =
    new Map();

  constructor() {}

  load(_templates: FormationTemplate[]) {
    for (const formation of _templates) {
      this._formationMap.set(formation.id, formation);

      if (
        formation.friendlyFireImmuneDamageTypes !== undefined &&
        formation.friendlyFireImmuneDamageTypes.length > 0
      ) {
        this._friendlyFireImmuneDamageTypes.set(
          formation.id,
          new Set(formation.friendlyFireImmuneDamageTypes)
        );
      }
    }
  }

  getTemplate(id: string | null): FormationTemplate | null {
    return this._formationMap.get(id!) ?? null;
  }

  isFriendlyFireImmune(id: string, damageType: DamageTypeName): boolean {
    return (
      this._friendlyFireImmuneDamageTypes.get(id)?.has(damageType) ?? false
    );
  }
}
