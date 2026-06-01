import { deepMerge } from "./object-merge";

describe("deepMerge()", () => {
  it("merges nested objects key by key, keeping untouched siblings", () => {
    const target = { a: { x: 1, y: 2 }, b: 3 };
    const result = deepMerge(target, { a: { y: 20 } });
    expect(result).toEqual({ a: { x: 1, y: 20 }, b: 3 });
  });

  it("replaces arrays wholesale instead of merging elements", () => {
    const target = { list: [1, 2, 3] };
    const result = deepMerge(target, { list: [9] });
    expect(result.list).toEqual([9]);
  });

  it("skips undefined values in the source", () => {
    const target = { a: 1, b: 2 };
    const result = deepMerge(target, { a: undefined, b: 5 });
    expect(result).toEqual({ a: 1, b: 5 });
  });

  it("overrides a primitive leaf", () => {
    const target = { n: 10, s: "x", flag: false };
    const result = deepMerge(target, { n: 32, flag: true });
    expect(result).toEqual({ n: 32, s: "x", flag: true });
  });

  it("does not mutate target or source", () => {
    const target = { a: { x: 1 }, list: [1] };
    const source = { a: { x: 2 } };
    const result = deepMerge<typeof target>(target, source);
    expect(target).toEqual({ a: { x: 1 }, list: [1] });
    expect(source).toEqual({ a: { x: 2 } });
    expect(result.a).not.toBe(target.a);
    expect(result.list).not.toBe(target.list);
  });

  it("returns a clone of target when the source is empty or undefined", () => {
    const target = { a: 1, nested: { b: 2 } };
    expect(deepMerge(target, {})).toEqual(target);
    expect(deepMerge(target, undefined)).toEqual(target);
    expect(deepMerge(target, {}).nested).not.toBe(target.nested);
  });

  it("adds keys present only in the source", () => {
    const result = deepMerge<{ a: number; b?: number }>({ a: 1 }, { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });
});
