import { IUnit, UnitCategoryId } from "@lob-sdk/types";
import { medianPoint } from "@lob-sdk/utils";
import { Vector2 } from "@lob-sdk/vector";

export class UnitGroup<T extends IUnit = IUnit> {
  cachedCenter: Vector2 | null = null;
  player: number;

  constructor(public units: T[], public category: UnitCategoryId) {
    this.player = units[0].player;
  }

  getCenter() {
    if (!this.cachedCenter) {
      const median = medianPoint(this.units.map((unit) => unit.position));
      this.cachedCenter = new Vector2(median.x, median.y);
    }

    return this.cachedCenter;
  }

  addUnit(unit: T) {
    this.units.push(unit);
    this.cachedCenter = null;
  }

  get size() {
    return this.units.length;
  }
}
