import { DynamicBattleType, Scenario } from "@lob-sdk/types";

export class ScenarioFeatures {
  /** Whether players pick their own army composition. */
  static hasDynamicArmy(scenario: Scenario): boolean {
    return scenario.allowDynamicArmy === true;
  }

  /** Scenario ships with a locked unit set; deployment phase is skipped. */
  static hasFixedRoster(scenario: Scenario): boolean {
    return !ScenarioFeatures.hasDynamicArmy(scenario);
  }

  /** Player slots and teams are baked in; matchmaking can't reshape them. */
  static hasFixedPlayers(scenario: Scenario): boolean {
    return Array.isArray(scenario.players) && scenario.players.length > 0;
  }

  /** Where gameplay starts — scenarios with a deployment phase begin at turn 0. */
  static getInitialTurnNumber(scenario: Scenario): number {
    return ScenarioFeatures.hasFixedRoster(scenario) ? 1 : 0;
  }

  /** Gates a requested battle type — fixed-roster scenarios can't carry one. */
  static correctDynamicBattleType(
    scenario: Scenario | null,
    requested: DynamicBattleType | null,
  ): DynamicBattleType | null {
    return scenario && !ScenarioFeatures.hasDynamicArmy(scenario)
      ? null
      : requested;
  }
}
