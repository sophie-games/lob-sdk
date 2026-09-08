# Contextual game tips

`../game-data/shared/game-tips.ts` is the default catalog. Its typed objects contain only serializable data; there are no callbacks or client imports. Catalog order determines queue order when several tips match.

To add or adapt a lesson using an existing mechanic:

1. Add a definition with a unique, stable `id`; this is also its existing client preference key, so keep it when changing wording or thresholds.
2. Set `on` to the events that should evaluate it and choose a `condition` with its parameters. `ready` checks after preferences load; `stateUpdated` checks GUI state updates and stopped animations. Other events describe explicit selection/order actions.
3. Set `battleOnly`, optional `enabled`, and optional `eras` (omitted means all eras). Disabled and other-era entries are excluded before preferences load.
4. Add `titleKey`, `descriptionKey`, and optional `action` with a localized `labelKey`. Translations belong in every SDK locale. Keys default to `common`; other namespaces use `namespace:key`.

The ammo/organization ratios are fractions of the player's base reserve or the unit's maximum organization. Victory point ratios compare the player's team with the average of all teams, not the leading opponent. `blockedShot.categories` selects the relevant era's unit category IDs. Geometry, visibility and combat eligibility still come from the game's rules.

The client hook accepts a replacement catalog, evaluates named conditions, queues each ID once and persists it when shown. Finished games, spectators and active tutorials suppress all tips. The panel renders the definition's text and resolves its action without checking tip IDs. Target actions disappear when their entity no longer exists.

A new mechanic needs a condition variant in `types.ts` and its evaluator in the client's `evaluate-game-tip.ts`; a new destination needs an action variant and a handler in `game-tip-action.ts`. Adding a lesson using existing conditions/actions requires no hook or panel changes.

This is the extension seam for future era or mod catalogs, not a runtime mod loader or scripting language. External catalog loading and validation are intentionally outside the current implementation.
