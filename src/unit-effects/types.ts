export interface UnitEffectDisplayStat {
  label: string;
  type: "percentage" | "text";
  signed?: boolean;
  value?: number | string;
  color?: "red" | "green";
}
