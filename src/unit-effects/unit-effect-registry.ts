import { BaseUnitEffect } from "./base-unit-effect";
import { UnitEffectDto } from "@lob-sdk/types";

/**
 * Type for unit effect constructors that must accept duration as first parameter
 * and may accept additional parameters of any type.
 *
 * Note: We use `args[]` for rest parameters because different effect classes
 * have different constructor signatures that cannot be known at compile time.
 * The first parameter (duration) is still type-safe, and the registry ensures
 * correct instantiation at runtime.
 */
type UnitEffectConstructor = new (
  duration: number,
  ...args: number[]
) => BaseUnitEffect;

/**
 * Registry that maps effect IDs to their string names and vice versa.
 * This allows templates to reference effects by name while keeping DTOs compact with numeric IDs.
 */
export class UnitEffectRegistry {
  private static _idToName: Map<number, string> = new Map();
  private static _nameToId: Map<string, number> = new Map();
  private static _idToClass: Map<number, UnitEffectConstructor> = new Map();

  /**
   * Registers an effect class with its ID and name.
   * Should be called automatically when effect classes are loaded.
   * @throws Error if the ID or name is already registered by another effect.
   */
  static register(
    effectClass: UnitEffectConstructor & { id: number; name: string }
  ): void {
    const id = effectClass.id;
    const effectName = effectClass.name; // The effect's string name (e.g., "has_fired")

    // Check for duplicate ID
    if (this._idToName.has(id)) {
      const existingEffectName = this._idToName.get(id)!;
      throw new Error(
        `Cannot register effect with ID ${id} and name "${effectName}": ` +
          `Effect ID ${id} is already registered to name "${existingEffectName}"`
      );
    }

    // Check for duplicate name
    if (this._nameToId.has(effectName)) {
      const existingId = this._nameToId.get(effectName)!;
      throw new Error(
        `Cannot register effect with ID ${id} and name "${effectName}": ` +
          `Effect name "${effectName}" is already registered to ID ${existingId}`
      );
    }

    this._idToName.set(id, effectName);
    this._nameToId.set(effectName, id);
    this._idToClass.set(id, effectClass);
  }

  /**
   * Gets the string name for an effect ID.
   * @param id - The numeric effect ID
   * @returns The effect name, or undefined if not found
   */
  static getName(id: number): string | undefined {
    return this._idToName.get(id);
  }

  /**
   * Gets the numeric ID for an effect name.
   * @param name - The string effect name
   * @returns The effect ID, or undefined if not found
   */
  static getId(name: string): number | undefined {
    return this._nameToId.get(name);
  }

  /**
   * Gets the effect class for an effect ID.
   * @param id - The numeric effect ID
   * @returns The effect class, or undefined if not found
   */
  static getEffectClass(id: number): UnitEffectConstructor | undefined {
    return this._idToClass.get(id);
  }

  /**
   * Converts an effect name (string) to its numeric ID.
   * Useful for parsing templates that use string names.
   * @param name - The effect name
   * @returns The numeric ID
   * @throws Error if the name is not registered
   */
  static nameToIdOrThrow(name: string): number {
    const id = this.getId(name);
    if (id === undefined) {
      throw new Error(`Unknown effect name: "${name}"`);
    }
    return id;
  }

  /**
   * Converts an effect ID (number) to its string name.
   * @param id - The numeric effect ID
   * @returns The effect name
   * @throws Error if the ID is not registered
   */
  static idToNameOrThrow(id: number): string {
    const name = this.getName(id);
    if (name === undefined) {
      throw new Error(`Unknown effect ID: ${id}`);
    }
    return name;
  }

  /**
   * Gets all registered effect names.
   * @returns Array of all registered effect names
   */
  static getAllNames(): string[] {
    return Array.from(this._nameToId.keys());
  }

  /**
   * Gets all registered effect IDs.
   * @returns Array of all registered effect IDs
   */
  static getAllIds(): number[] {
    return Array.from(this._idToName.keys());
  }

  /**
   * Creates a unit effect instance from a DTO.
   * @param dto - The effect DTO containing [id, duration, ...args]
   * @returns A new instance of the effect
   * @throws Error if the effect ID is not registered
   */
  static create(dto: UnitEffectDto): BaseUnitEffect {
    const [effectId, ...args] = dto;
    const effectClass = this.getEffectClass(effectId);

    if (!effectClass) {
      throw new Error(`Unknown unit effect: ${effectId}`);
    }

    return Reflect.construct(effectClass, args);
  }
}
