import { EntityId } from "@lob-sdk/types";
import { NapoleonicBotStrategy, INapoleonicBot } from "./types";
import { SkirmisherStrategy } from "./strategies/skirmisher-strategy";
import { ArtilleryStrategy } from "./strategies/artillery-strategy";
import { InfantryStrategy } from "./strategies/infantry-strategy";
import { CavalryStrategy } from "./strategies/cavalry-strategy";
import { ShipStrategy } from "./strategies/ship-strategy";

/**
 * Represents a distinct grouping of units on the battlefield.
 * An army group evaluates threats and executes its own strategic logic independently.
 */
export class ArmyGroup {
  private static _lastId = 0;

  public readonly id: number;
  private readonly _unitIds: Set<EntityId>;
  public readonly strategies: Record<string, NapoleonicBotStrategy>;

  constructor(bot: INapoleonicBot) {
    this.id = ++ArmyGroup._lastId;
    this._unitIds = new Set();
    this.strategies = {
      skirmishers: new SkirmisherStrategy(bot),
      artillery: new ArtilleryStrategy(bot),
      infantry: new InfantryStrategy(bot),
      cavalry: new CavalryStrategy(bot),
      ships: new ShipStrategy(bot),
    };
  }

  public addUnit(id: EntityId): void {
    this._unitIds.add(id);
  }

  public removeUnit(id: EntityId): void {
    this._unitIds.delete(id);
  }

  public hasUnit(id: EntityId): boolean {
    return this._unitIds.has(id);
  }

  public getUnits(): EntityId[] {
    return Array.from(this._unitIds);
  }

  public get size(): number {
    return this._unitIds.size;
  }
}
