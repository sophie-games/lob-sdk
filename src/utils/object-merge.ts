/**
 * Recursive Partial: nested object properties are optional all the way down.
 * Arrays are kept whole (overrides replace an array wholesale, never merge it
 * element-by-element), so their element type is preserved. Used by the sparse
 * per-scenario game-rule/constant overrides.
 */
export type DeepPartial<T> = T extends (infer _U)[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Merges `source` onto a deep clone of `target`. Plain objects merge key by
 * key; arrays and primitives in `source` replace the target value wholesale.
 * `undefined` values in `source` are skipped (treated as "no override"). Never
 * mutates either argument.
 */
export function deepMerge<T>(target: T, source: DeepPartial<T> | undefined): T {
  if (source === undefined) return clone(target);
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return clone(source) as T;
  }
  const out = clone(target) as Record<string, unknown>;
  for (const [key, srcVal] of Object.entries(source)) {
    if (srcVal === undefined) continue;
    const tgtVal = out[key];
    out[key] =
      isPlainObject(tgtVal) && isPlainObject(srcVal)
        ? deepMerge(tgtVal, srcVal as DeepPartial<typeof tgtVal>)
        : clone(srcVal);
  }
  return out as T;
}
