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
