export interface IVpService {
  getTeamVictoryPoints(team: number): number;
  getTeamsVictoryStats(): GetVictoryPointsTeam[];
  getVictoryPointDifference(team: number): number;
  getPlayerTicksUnderPressure(playerNumber: number): number;
  clearTurnCache(): void;
  updateArmiesPower(): void;
  getPlayerBaseArmyPower(playerNumber: number): number;
  getPlayerArmyPower(playerNumber: number): number;
  getTeamArmyPower(team: number): number;
}

export interface ArmyPowerStats {
  currentPower: number;
  initialPower: number;
}

export interface GetVictoryPointsTeam {
  team: number;
  initialArmyPower: number;
  currentArmyPower: number;
  ticksUnderPressure: number | null;
  objectiveVps: number;
}
