export interface IBaseUnit {
  currentFormation: string;
  pendingFormationId: string | null;
  /**
   * Remaining ticks for formation change. Formation changes cannot last more
   * than 1 turn.
   */
  formationChangeTicksRemaining: number;
}
