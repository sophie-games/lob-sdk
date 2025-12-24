export interface IVpService {
  getTeamVictoryPoints(team: number): number;
  getTeamVictoryStats(
    team: number,
    objectiveProportion: number
  ): GetVictoryPointsTeam;
  getAllTeamsVictoryStats(): GetVictoryPointsTeam[];
  getVictoryPointDifference(team: number): number;
  getPlayerTicksUnderPressure(playerNumber: number): number;
  clearTurnCache(): void;
  updateArmiesPower(): void;
  getPlayerBaseArmyPower(playerNumber: number): number;
  getPlayerArmyPower(playerNumber: number): number;
  getTeamArmyPower(team: number): number;
  getObjectivesProportion(team: number): number;
}

export interface ArmyPowerStats {
  currentPower: number;
  initialPower: number;
}

export interface GetVictoryPointsTeam {
  initialArmyPower: number;
  currentArmyPower: number;
  objectiveProportion: number;
  ticksUnderPressure: number | null;
}
