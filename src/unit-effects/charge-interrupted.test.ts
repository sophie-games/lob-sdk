import { BaseUnit } from "@lob-sdk/unit";
import { ChargeInterrupted } from "./charge-interrupted";
import { UnitEffectRegistry } from "./unit-effect-registry";

describe("ChargeInterrupted", () => {
  const makeUnit = () =>
    ({
      cannotCharge: false,
      deleteEffect: jest.fn(),
    }) as unknown as BaseUnit;

  it("blocks charging when added and at the start of each tick", () => {
    const unit = makeUnit();
    const effect = new ChargeInterrupted(5);

    effect.onAdded(unit);
    expect(unit.cannotCharge).toBe(true);

    unit.cannotCharge = false;
    effect.onTickStart(unit);
    expect(unit.cannotCharge).toBe(true);
  });

  it("preserves its remaining tick duration through DTO serialization", () => {
    const dto = new ChargeInterrupted(11).toDto();
    const restored = UnitEffectRegistry.create(dto) as ChargeInterrupted;

    expect(dto).toEqual([ChargeInterrupted.id, 11]);
    expect(restored).toBeInstanceOf(ChargeInterrupted);
    expect(restored.duration).toBe(11);
  });

  it("expires after its configured number of ticks", () => {
    const unit = makeUnit();
    const effect = new ChargeInterrupted(2);

    effect.onTickEnd(unit);
    expect(effect.duration).toBe(1);
    expect(unit.deleteEffect).not.toHaveBeenCalled();

    effect.onTickEnd(unit);
    expect(unit.deleteEffect).toHaveBeenCalledWith(ChargeInterrupted.id);
  });
});
