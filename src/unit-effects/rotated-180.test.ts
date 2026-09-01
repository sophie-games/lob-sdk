import { Rotated180 } from "./rotated-180";
import { UnitEffectRegistry } from "./unit-effect-registry";

describe("Rotated180", () => {
  it("describes only the movement lock while a turnaround is pending", () => {
    const effect = new Rotated180(8);

    expect(effect.getDisplayStats({} as never)).toEqual([
      {
        label: "cannotMove",
        type: "text",
        color: "red",
      },
    ]);
  });

  it("preserves the pending facing through DTO serialization", () => {
    const dto = new Rotated180(8, Math.PI).toDto();
    const restored = UnitEffectRegistry.create(dto) as Rotated180;

    expect(dto).toEqual([Rotated180.id, 8, Math.PI]);
    expect(restored.duration).toBe(8);
    expect(restored.targetRotation).toBeCloseTo(Math.PI);
  });
});
