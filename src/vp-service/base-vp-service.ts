import { Player, PlayerSetup } from "@lob-sdk/types";
import { GetVictoryPointsTeam } from "./types";

export abstract class BaseVpService {
  cachedAverageVps: number | null = null;
  cachedVictoryPoints: number[] | null = null;
  cachedBaseArmyPower = new Map<number, number>();
  cachedArmiesPower = new Map<number, number>();

  abstract getTeamVictoryPoints(team: number): number;
  abstract getTeamsVictoryStats(): GetVictoryPointsTeam[];
  abstract getVictoryPointDifference(team: number): number;
  abstract getPlayerTicksUnderPressure(playerNumber: number): number;
  abstract getPlayerBaseArmyPower(playerNumber: number): number;
  abstract getTeamArmyPower(team: number): number;

  clearTurnCache() {
    this.cachedArmiesPower.clear();
    this.cachedVictoryPoints = null;
    this.cachedBaseArmyPower.clear();
    this.cachedAverageVps = null;
  }

  /**
   * Gets the average victory points across all teams.
   * Caches the result to avoid recalculating multiple times per turn.
   */
  getAverageVictoryPoints(playerSetups: PlayerSetup[]): number {
    if (this.cachedAverageVps !== null) {
      return this.cachedAverageVps;
    }

    // Get all unique teams from playerSetups
    const allTeams = new Set<number>();
    for (const setup of playerSetups) {
      allTeams.add(setup.team);
    }

    // Calculate average VP of all teams
    let totalVps = 0;
    let teamCount = 0;
    for (const team of allTeams) {
      totalVps += this.getTeamVictoryPoints(team);
      teamCount++;
    }

    this.cachedAverageVps = teamCount > 0 ? totalVps / teamCount : 0;
    return this.cachedAverageVps;
  }

  /**
   * Calculates the proportional victory points difference for a team compared to the average of all teams.
   * Returns a positive value if the team has more VPs than average, negative if less.
   * Uses cached average VPs to avoid recalculating multiple times per turn.
   */
  getVictoryPointsRatioFromAverage(
    playerSetups: PlayerSetup[],
    team: number
  ): number {
    const teamVps = this.getTeamVictoryPoints(team);
    const avgVps = this.getAverageVictoryPoints(playerSetups);

    // Proportional difference: (teamVps - avgVps) / avgVps
    // If avgVps is 0, use absolute difference to avoid division by zero
    return avgVps > 0 ? (teamVps - avgVps) / avgVps : teamVps - avgVps;
  }

  protected _getTeamVictoryStats(
    players: Player[],
    team: number,
    objectiveVps: number
  ): GetVictoryPointsTeam {
    let ticksUnderPressure: number = -1;
    let initialArmyPower: number = 0;

    for (const player of players) {
      if (player.team !== team) {
        continue;
      }

      initialArmyPower += this.getPlayerBaseArmyPower(player.playerNumber);

      // Take the value only from the first player we encounter
      if (ticksUnderPressure === -1) {
        ticksUnderPressure = this.getPlayerTicksUnderPressure(
          player.playerNumber
        );
      }
    }

    // This is unlikely to happen, but just in case
    if (ticksUnderPressure === -1) {
      ticksUnderPressure = 0;
    }

    return {
      team,
      initialArmyPower: initialArmyPower,
      currentArmyPower: this.getTeamArmyPower(team),
      ticksUnderPressure: ticksUnderPressure,
      objectiveVps,
    };
  }
}
