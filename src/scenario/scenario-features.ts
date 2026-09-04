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

  /**
   * Players position their own objectives during the deployment phase (big in
   * the deployment box, smalls advanced and spaced). Auto-enabled for random
   * maps in {@link normalizeScenario}.
   */
  static hasPlaceableObjectives(scenario: Scenario): boolean {
    return scenario.placeableObjectives === true;
  }

  /** Player slots and teams are baked in; matchmaking can't reshape them. */
  static hasFixedPlayers(
    scenario: Scenario,
  ): scenario is Scenario & { players: NonNullable<Scenario["players"]> } {
    return Array.isArray(scenario.players) && scenario.players.length > 0;
  }

  /** Whether a scenario fully defines the map, seats, and starting roster. */
  static isFixedRosterPreset(scenario: Scenario): boolean {
    return (
      scenario.map !== undefined &&
      ScenarioFeatures.hasFixedPlayers(scenario) &&
      Array.isArray(scenario.units) &&
      scenario.units.length > 0 &&
      !ScenarioFeatures.hasDynamicArmy(scenario)
    );
  }

  /** Whether a fixed-roster preset can safely replace one unit per player. */
  static hasOneUnitPerPlayer(scenario: Scenario): boolean {
    if (!ScenarioFeatures.isFixedRosterPreset(scenario)) return false;
    if (scenario.units!.length !== scenario.players!.length) return false;

    const unitCountByPlayer = new Map<number, number>();
    for (const unit of scenario.units!) {
      unitCountByPlayer.set(
        unit.player,
        (unitCountByPlayer.get(unit.player) ?? 0) + 1,
      );
    }
    return scenario.players!.every(
      (player) => unitCountByPlayer.get(player.player) === 1,
    );
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
