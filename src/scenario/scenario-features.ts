import { DynamicBattleType, Scenario } from "@lob-sdk/types";

export class ScenarioFeatures {
  /** Whether players pick their own army composition. */
  static hasDynamicArmy(scenario: Scenario): boolean {
    return scenario.allowDynamicArmy === true;
  }

  /**
   * Scenario opens with a deployment phase (turn 0) so players can reposition
   * their army inside the deployment zones. Orthogonal to `allowDynamicArmy`
   * — a scenario can ship with a fixed roster and still grant a deployment
   * phase (set the flag in JSON) or ship a dynamic army without one. Legacy
   * random/hybrid scenarios get this set automatically in `normalizeScenario`.
   */
  static hasDeploymentPhase(scenario: Scenario): boolean {
    return scenario.allowDeploymentPhase === true;
  }

  /** Player slots and teams are baked in; matchmaking can't reshape them. */
  static hasFixedPlayers(
    scenario: Scenario,
  ): scenario is Scenario & { players: NonNullable<Scenario["players"]> } {
    return Array.isArray(scenario.players) && scenario.players.length > 0;
  }

  /** Where gameplay starts — scenarios with a deployment phase begin at turn 0. */
  static getInitialTurnNumber(scenario: Scenario): number {
    return ScenarioFeatures.hasDeploymentPhase(scenario) ? 0 : 1;
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
