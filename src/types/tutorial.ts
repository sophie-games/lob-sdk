import { OrderType } from "./order";

/**
 * Data-driven tutorial schema.
 *
 * A Tutorial is a list of Chapters. Each Chapter has a fire condition and a
 * sequence of Beats. Beats are linear; each one shows a bubble (optionally a
 * spotlight and/or animated gesture) and advances on a specific event.
 *
 * The schema is intentionally narrow — 95% of tutorial flows are "linear
 * sequence with advance-on-event". Complex branching / persistent state
 * belongs in the generic `Scenario.triggers` array, not here.
 *
 * Consumed client-side by the TutorialRunner; never evaluated server-side.
 */

export type TutorialBeatAdvance =
  | "click" // any click on the overlay dismisses (default for info bubbles)
  | "button" // bubble shows an explicit Continue button
  | "never" // beat only dismisses via `showWhen` auto-skip — no event advances it
  | "unitSelected" // first UNIT_SELECTED event on the client
  | "unitsDeselected" // first UNIT_DESELECTED event that leaves selection empty
  | "unitRepositioned" // first reposition committed in the deployment phase
  | "deploymentConfirmed" // turn-0 submit-orders press
  | "orderPlaced" // a movement order was drawn on the map
  | "orderRemoved" // the bound unit's (or any matching unit's) order was cleared; auto-skipped if no matching order exists
  | "orderTypeModalOpened" // SelectOrderModal opens; auto-skipped if hud.orderType already matches
  | "orderTypeSelected" // hud.orderType changed to one that matches; auto-skipped if already matching on activation
  | "formationModalOpened" // FormationModal opens; auto-skipped if all selected units already have the matching formation
  | "formationSelected" // a formation was applied that matches; auto-skipped if already matching on activation
  | "ordersSubmitted" // submit-orders press on a battle turn (turn > 0)
  | "battleReportClosed" // BattleReportModal close (X) was pressed
  | "gameMenuOpened" // GameMenu modal became visible (HUD menu button pressed)
  | "gameMenuExited"; // Exit button inside GameMenu was pressed

/**
 * Input scheme the player is using. Mirrors the client-side type but lives in
 * the schema because beats can opt into a subset of schemes via `inputSchemes`.
 */
export type TutorialInputScheme = "mouse" | "touch";

export type TutorialHighlightStyle = "spotlight" | "ring";

/**
 * Dynamic target selector: resolved at runtime against the current game state.
 * Use when the beat needs to point at something only known at runtime (e.g.
 * procedurally-generated terrain, objectives whose owner changes between
 * matches). A tagged union so adding new kinds is an additive schema change;
 * the client dispatches by `kind` and the type-checker enforces exhaustiveness.
 */
export type TutorialHighlightSelector =
  | {
      kind: "terrainNearObjectives";
      /** Terrain categories to match (matches `TerrainCategoryType`). */
      terrain: ("forest" | "building")[];
      /** Which objectives to anchor the search on. */
      objective: "neutral" | "friendly" | "enemy";
      /**
       * Restrict the anchor set to a single objective by name (set via the
       * scenario's objective instruction). Useful when a beat needs to
       * point at a specific side (e.g. the left-side skirmisher should
       * head to the left-side objective). Beats matching no named
       * objective resolve to null and the fallback chain advances.
       */
      objectiveName?: string;
      /** Tile-space search radius from each matching objective's center. */
      radiusTiles: number;
      /** Min cluster size (tiles) to highlight. Filters out noise. Defaults to 2. */
      minTiles?: number;
      /** Hard cap on rendered clusters. Defaults to 12. */
      maxClusters?: number;
      /**
       * World-pixel rect that gates which terrain tiles are considered. A
       * tile counts only when its pixel rect overlaps these bounds; tiles
       * outside are invisible to both the radius check and the flood fill,
       * so multi-tile clusters straddling the bounds get clipped.
       */
      worldBounds?: { x: number; y: number; width: number; height: number };
      /**
       * Drop clusters whose bbox already contains the destination of a
       * pending move order from a friendly unit of `category`. Lets a
       * "send the second skirmisher to a forest" beat avoid spotlighting
       * the same forest the first skirmisher was just sent to. If every
       * cluster ends up filtered, the unfiltered list is returned so the
       * highlight is never empty.
       */
      excludeOccupiedBy?: { category: string | string[] };
    }
  | {
      /**
       * Forest/building tile clusters near visible enemy units. Same shape
       * as `terrainNearObjectives` but anchored on enemies — used by the
       * skirmisher beats to point at cover within reach of the closest
       * enemy.
       */
      kind: "terrainNearEnemy";
      terrain: ("forest" | "building")[];
      /** World-px search radius from each enemy unit. */
      radiusPx: number;
      minTiles?: number;
      maxClusters?: number;
    }
  | {
      kind: "objectives";
      objective: "neutral" | "friendly" | "enemy";
      /** Tile-space radius around each objective for the highlight rect. Defaults to 6. */
      radiusTiles?: number;
    }
  | {
      /**
       * Single player-owned unit matching `category`. The highlight follows
       * the unit each frame (so it tracks movement/rotation). Use
       * `pick: "firstUnordered"` to highlight the next skirmisher the player
       * hasn't drawn an order for yet — makes a "one unit at a time" beat
       * sequence compose without hardcoding unit ids.
       */
      kind: "unit";
      category: string | string[];
      pick: "firstUnordered" | "first" | "leftmostUnordered" | "rightmostUnordered";
    }
  | {
      /**
       * Visible enemy units. Each enemy produces one tight world-space rect
       * centered on its position. Used as a fallback in selector chains
       * when no terrain cover is reachable.
       */
      kind: "enemyUnits";
      /** Optional category filter. Defaults to any enemy unit. */
      category?: string | string[];
      /** Optional `currentFormation` filter (e.g. `"square"`). */
      formation?: string | string[];
    }
  | {
      /**
       * The player unit (of `category`) closest to a visible enemy. When
       * `threatCategory` is set, only enemies of that category count toward
       * the closest-pair search. Used by situational chapters to highlight
       * the unit the lesson is about (e.g. the skirmisher near an enemy
       * battery, the infantry threatened by cavalry on its flank).
       */
      kind: "playerUnitNearestThreat";
      category: string | string[];
      threatCategory?: string | string[];
    }
  | {
      /**
       * The visible enemy unit closest to a player unit of `playerCategory`,
       * optionally filtered by `enemyCategory`. Pairs with
       * `playerUnitNearestThreat` so a chapter can highlight both sides of
       * the threat with consistent picks.
       */
      kind: "nearestEnemyTo";
      playerCategory: string | string[];
      enemyCategory?: string | string[];
      /**
       * Absolute org threshold in pp (0..100). When set, the highlight
       * resolves to the closest enemy at or below this org — same picking
       * function as the `weakEnemyTarget` move destination, so the intro
       * highlight and the gesture target stay in sync.
       */
      maxEnemyOrgPp?: number;
      /** When true, only consider routing enemies (used by pursue-router). */
      onlyRouting?: boolean;
    }
  | {
      /**
       * The single player unit this chapter run is bound to. Authors leave
       * `unitId` unset in JSON; the chapter-builder fills it in at activation
       * for chapters fired with `oncePerUnit` so beats can highlight the
       * exact unit that triggered the situation. The resolver returns null
       * when the unit no longer exists, letting fallback chains advance.
       */
      kind: "specificUnit";
      unitId?: number;
    }
  | {
      /**
       * Every player unit currently matching the named situation predicate.
       * Re-evaluated each frame so the highlight set shrinks as the player
       * acts (e.g. forms line on threatened infantry one by one). Pairs with
       * the `anyUnitInSituation` showWhen so the beat both shows the
       * remaining work and auto-dismisses when the work is done.
       */
      kind: "playerUnitsInSituation";
      situation: TutorialSituationKey;
    }
  | {
      /**
       * The bound cavalry plus the enemy infantry whose exposed flank it
       * should charge — same picker as the `flankedInfantryTarget` move
       * destination, so the intro highlight, the gesture target ring, and
       * the gesture itself stay in sync. Returns both rects so a single
       * selector entry highlights both ends of the charge. Requires a
       * chapter bound with `oncePerUnit`.
       */
      kind: "flankedEnemyInfantry";
      /**
       * Search radius from the cavalry, world px. Optional when the
       * chapter fires off a situation that exposes a target range
       * (e.g. `cavalryVsInfantryFlank.targetRangePx`); the resolver
       * uses the situation's value in preference. Required otherwise.
       */
      withinPx?: number;
      /** Enemy categories that count as infantry. */
      enemyCategory: string[];
      /** Min run-up distance, world px. Default 8. */
      minRunupPx?: number;
      /**
       * For non-line targets, require cav.org − inf.org ≥ this. Default 0.10.
       */
      minOrgAdvantage?: number;
    };

export interface TutorialHighlight {
  /**
   * One or more static targets registered in the client tutorial-target-registry.
   * When an array is provided, the overlay renders a highlight per resolved
   * target and uses the first target for bubble/gesture placement.
   */
  targetId?: string | string[];
  /**
   * Runtime-resolved target(s). Single selector, or an ordered fallback chain:
   * the first entry that resolves to ≥1 rect wins. Later entries are
   * fallbacks for edge cases (e.g. "no forests near the neutral objectives").
   */
  targetSelector?: TutorialHighlightSelector | TutorialHighlightSelector[];
  style?: TutorialHighlightStyle;
  /** When true, camera fits to the highlighted region. Defaults to true for selectors. */
  fitCamera?: boolean;
}

export type TutorialGesture =
  | "selectionBox"
  | "selectGroup"
  | "moveUnit"
  | "drawOrder"
  | "rotate"
  | "tap";

export type TutorialBeatPlacement = "top" | "bottom" | "left" | "right";

/**
 * World-space rect describing where the tutorial wants the player to end up
 * placing the units selected by this beat. Used by the moveUnit gesture hint
 * (positions the animation over the destination, not the full deployment
 * zone) and by the ghost-projection layer (renders semi-transparent unit
 * silhouettes inside this rect).
 *
 * Two flavors:
 *  - **Static rect** (default; `kind` omitted or `"rect"`): hard-coded coords.
 *  - **Selector**: resolved at chapter activation against current game state.
 *    Used by adaptive chapters that re-fire each turn.
 */
export interface TutorialMoveDestinationStatic {
  kind?: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Runtime-resolved destinations. The resolver takes the live game state plus
 * a small per-chapter context (so artillery beats can read the rect that
 * infantry beats already produced) and emits a static rect.
 */
export type TutorialMoveDestinationSelector =
  | {
      /**
       * Wraparound band that wraps the visible enemy from the player's side
       * at `minClearancePx` from the closest enemy edge. The output is an
       * axis-aligned rect facing the enemy — projection-sync distributes
       * units along it the same way it does for any wide line.
       */
      kind: "arcAroundEnemyCenter";
      /** Min world-px clearance from the closest enemy edge. Default 64. */
      minClearancePx?: number;
      /** Band thickness (world px). Default 30. */
      bandThicknessPx?: number;
      /** Half-arc length cap (world px). Default 240. */
      maxHalfWidthPx?: number;
    }
  | {
      /**
       * Small rect centered at the closest weak enemy. "Weak" means an enemy
       * whose category is in `alwaysWeakCategories` OR whose org% is at
       * least `orgGapPp` percentage points lower than this player's unit.
       */
      kind: "weakEnemyTarget";
      /**
       * Search radius from the player's units of the beat's
       * `unitCategory`. Optional when the chapter fires off a situation
       * that exposes a search radius (e.g. `cavalryVsWeakerCavalry`,
       * `cavalryVsEqualCavalry`, `skirmisherThreatenedByArtillery`); the
       * resolver uses the situation's value in preference.
       */
      withinPx?: number;
      /** Org gap in percentage points (0..100). Default 40. */
      orgGapPp?: number;
      /** Categories that always count as weak. Default skirmisher + artillery. */
      alwaysWeakCategories?: string[];
      /** Restrict considered enemies to these categories. */
      enemyCategory?: string | string[];
      /**
       * Absolute org threshold in pp (0..100). When set, an enemy at or below
       * this org counts as weak — used by "shaken target" lessons.
       */
      maxEnemyOrgPp?: number;
      /** Output rect side length (world px). Default 48. */
      rectSizePx?: number;
      /** When true, only consider routing enemies (used by pursue-router). */
      onlyRouting?: boolean;
    }
  | {
      /**
       * Band parallel to the player↔enemy axis, offset onto the player's
       * side at `distancePx` from the nearest enemy. Used when cavalry has
       * no charge target and should hold a stand-off line.
       */
      kind: "maintainDistanceFromEnemy";
      /** Distance from the nearest enemy unit, world px. */
      distancePx: number;
      bandThicknessPx?: number;
      bandWidthPx?: number;
    }
  | {
      /**
       * Band a short distance ahead of the player's frontmost line-infantry,
       * facing the enemy. Used for artillery default placement. When no
       * infantry destination has been resolved earlier in the chapter and no
       * line infantry exists, the resolver falls back to a band on the
       * player side near the enemy.
       */
      kind: "aheadOfInfantryLine";
      /** Forward offset from the infantry line, world px. Default 32. */
      aheadPx?: number;
      bandThicknessPx?: number;
      bandWidthPx?: number;
    }
  | {
      /** Band a short distance behind the player's infantry line. */
      kind: "behindInfantryLine";
      /** Back offset from the infantry line, world px. Default 48. */
      behindPx?: number;
      bandThicknessPx?: number;
      bandWidthPx?: number;
    }
  | {
      /**
       * Forest/building cluster near any visible enemy unit. Same algorithm
       * as the `terrainNearEnemy` highlight selector; emitted as a single
       * rect centered on the closest qualifying cluster.
       */
      kind: "terrainNearEnemy";
      terrain: ("forest" | "building")[];
      radiusPx: number;
      minTiles?: number;
    }
  | {
      /**
       * Band positioned `distancePx` behind the chapter's bound unit, in the
       * direction OPPOSITE the nearest visible enemy. Used by skirmisher
       * fallback beats so the suggested destination pulls the threatened unit
       * away from the threat that triggered the chapter. Resolves to undefined
       * when the chapter has no bound unit, the unit is gone, or no
       * qualifying enemy is visible.
       */
      kind: "awayFromUnit";
      /** Retreat distance from the bound unit's position, world px. */
      distancePx: number;
      bandThicknessPx?: number;
      bandWidthPx?: number;
      /** Enemy categories used to pick the threat. Defaults to any visible enemy. */
      threatCategory?: string | string[];
    }
  | {
      /**
       * Band positioned `distancePx` from the chapter's bound unit, in the
       * direction that maximizes distance from ALL non-routing threats within
       * `radiusPx`. Direction is the normalized sum of unit-vectors pointing
       * from each threat to the bound unit (each threat weighted equally).
       * Resolves to undefined when the bound unit is gone, no qualifying
       * threats are within range, or the threats are evenly spread (the sum
       * vector collapses below epsilon — no clear escape direction).
       */
      kind: "awayFromThreats";
      /** Retreat distance from the bound unit's position, world px. */
      distancePx: number;
      /**
       * Search radius for threats around the bound unit, world px.
       * Optional when the chapter fires off a situation that exposes a
       * threat radius — e.g. `skirmisherThreatenedByCavalry` provides
       * `threatRadiusPx`, which the resolver uses in preference to this
       * field. Required otherwise.
       */
      radiusPx?: number;
      /** Enemy categories that count as threats. Defaults to any visible enemy. */
      threatCategory?: string | string[];
      bandThicknessPx?: number;
      bandWidthPx?: number;
    }
  | {
      /**
       * Small rect at `distancePx` from the chapter's bound unit, along the
       * axis pointing toward the nearest visible enemy. When `distancePx` is
       * omitted, defaults to the bound unit's `walkMovement` — i.e. the tap
       * point sits exactly one walk-tick downrange of the unit. Used by
       * path-draw beats whose gesture is "tap toward the enemy" rather than
       * "draw a path to a specific spot". Resolves to undefined when the
       * chapter has no bound unit, the unit is gone, or no enemy is visible.
       */
      kind: "towardNearestEnemy";
      distancePx?: number;
      /** Multiplier on `walkMovement` when `distancePx` is omitted. Defaults to 1. */
      walkTicks?: number;
      rectSizePx?: number;
    }
  | {
      /**
       * Small rect centered on the closest enemy infantry whose flank is
       * exposed to the chapter's bound cavalry — i.e. the cavalry sits
       * outside the infantry's frontal cone (±60°). Skips square-formed
       * targets and pairings that don't meet the run-up / org-gap thresholds
       * the situation uses, so the highlighted unit is the same one the
       * `cavalryVsInfantryFlank` situation matched. Resolves to undefined
       * when the chapter has no bound unit or no qualifying enemy is in range.
       */
      kind: "flankedInfantryTarget";
      /**
       * Search radius from the cavalry, world px. Optional when the
       * chapter fires off `cavalryVsInfantryFlank`; the resolver uses
       * `targetRangePx` from the situation match in preference.
       */
      withinPx?: number;
      /** Enemy categories that count as infantry. */
      enemyCategory: string[];
      /** Min run-up distance, world px. Default 8. */
      minRunupPx?: number;
      /**
       * For non-line targets, require cav.org − inf.org ≥ this. Default 0.10.
       */
      minOrgAdvantage?: number;
      /** Output rect side length, world px. Default 48. */
      rectSizePx?: number;
    }
  | {
      /**
       * Rect centered on the closest enemy objective. Used by march beats
       * that want to point the player toward the contested side of the map
       * without hardcoding scenario coordinates. Resolves to undefined when
       * no enemy objective exists.
       */
      kind: "nearEnemyObjective";
      /** Output rect width, world px. */
      widthPx: number;
      /** Output rect height, world px. */
      heightPx: number;
    };

export type TutorialMoveDestination =
  | TutorialMoveDestinationStatic
  | TutorialMoveDestinationSelector;

/**
 * Predicate evaluated at beat activation. When false, the runner silently
 * dismisses the beat without showing it (the queue cursor advances). Used
 * to model parallel branches inside one chapter (e.g. cavalry Run vs
 * Maintain) without a state machine — the player only sees the branch
 * whose condition holds in the current battlefield.
 */
export type TutorialBeatCondition =
  | {
      /**
       * True iff at least one player unit of `unitCategory` has a "weak"
       * enemy in range. Same `alwaysWeakCategories` / `orgGapPp` semantics
       * as the `weakEnemyTarget` move destination.
       */
      kind: "anyUnitHasWeakTargetInRange";
      unitCategory: string | string[];
      withinPx: number;
      orgGapPp?: number;
      alwaysWeakCategories?: string[];
      enemyCategory?: string | string[];
      maxEnemyOrgPp?: number;
    }
  | {
      /** Negation of `anyUnitHasWeakTargetInRange`. */
      kind: "noUnitHasWeakTargetInRange";
      unitCategory: string | string[];
      withinPx: number;
      orgGapPp?: number;
      alwaysWeakCategories?: string[];
      enemyCategory?: string | string[];
      maxEnemyOrgPp?: number;
    }
  | {
      /**
       * True iff at least one enemy unit (default: any infantry/cavalry)
       * with org% ≥ `minOrgPp` is within `withinPx` of any player artillery.
       * Gates the "pull artillery back" override.
       */
      kind: "enemyPressingArtillery";
      withinPx: number;
      /** Min enemy org% (0..100) to count as a threat. Default 25. */
      minOrgPp?: number;
      /** Enemy categories that count as a threat. Default infantry + cavalry. */
      enemyCategory?: string | string[];
    }
  | {
      /** Negation of `enemyPressingArtillery`. */
      kind: "noEnemyPressingArtillery";
      withinPx: number;
      minOrgPp?: number;
      enemyCategory?: string | string[];
    }
  | {
      /**
       * True iff at least one player unit of `unitCategory` does NOT have a
       * pending order this turn whose type is in `orderType`. Used by
       * Run-1+ silent hint beats to skip themselves once the player has
       * already covered every unit in the category — no flicker, no noise.
       */
      kind: "anyUnitInCategoryNeedsOrder";
      unitCategory: string | string[];
      orderType: OrderType | OrderType[];
    }
  | {
      /**
       * True iff at least one player infantry unit is "ready for line": the
       * nearest visible enemy is within `withinPx` (musket-engagement range)
       * AND both flanks are secure. Per-unit pairing — A-in-range and
       * B-flanks-secure does not match. Gates the "switch to line" beat.
       *
       * Flank geometry is derived from the bearing to the nearest enemy
       * (treated as the unit's "front"); the two flanks are the perpendicular
       * half-planes. A flank counts as secure when either:
       *  - a friendly infantry unit lies within `flankCoverPx` on that side, OR
       *  - no enemy unit lies within `flankThreatPx` on that side.
       */
      kind: "anyInfantryReadyForLine";
      withinPx: number;
      flankCoverPx: number;
      flankThreatPx: number;
      /**
       * If set, only infantry whose `currentFormation` is NOT this id are
       * considered. Lets a "switch to line" beat go silent once the player
       * has actually switched, instead of re-firing while the situation
       * still otherwise matches.
       */
      currentFormationNot?: string;
    }
  | {
      /**
       * True iff the chapter's bound unit (`oncePerUnit` fires) has a
       * pending movement order. Lets a beat remind the player to clear
       * the order so the unit can stand still and autofire — auto-skipped
       * once the order is removed (or for chapters without a bound unit).
       */
      kind: "boundUnitHasMovementOrder";
    }
  | {
      /**
       * True iff at least one player unit in any of the listed categories
       * has a current/pending formation that is NOT in the listed
       * formations. Use as `showWhen` to skip formation-change lessons when
       * the player already complies. Both arrays are required and must be
       * non-empty.
       */
      kind: "anyUnitCategoryNotInFormation";
      unitCategory: string[];
      formationId: string[];
    }
  | {
      /**
       * True iff the chapter's bound unit has a current/pending formation
       * that is NOT in `formationId`. Use as `showWhen` on a beat that only
       * makes sense when the bound unit still needs the formation change
       * (e.g. an intro beat that says "switch to column"). Returns false
       * when there is no bound unit.
       */
      kind: "boundUnitNotInFormation";
      formationId: string[];
    }
  | {
      /**
       * True iff at least one player unit currently matches the named
       * situation predicate. Used as `showWhen` on the "ahora cambia las
       * demás" follow-up beat: auto-dismisses once the player has acted on
       * every threatened unit (situation set drops to empty).
       */
      kind: "anyUnitInSituation";
      situation: TutorialSituationKey;
    }
  | {
      /**
       * True iff the chapter's bound unit is currently among the units the
       * named situation predicate matches. Used as `showWhen` on every beat
       * of an `oncePerUnit` situational chapter so the lesson auto-dismisses
       * if the world stops fitting the lesson — e.g. the bound infantry
       * leaves column, the bound enemy forms square, the org gap closes, the
       * target moves out of range. Returns false when there is no bound
       * unit. Re-evaluated each frame.
       */
      kind: "boundUnitInSituation";
      situation: TutorialSituationKey;
    }
  | {
      /**
       * Logical AND. Use to compose a branch gate (e.g.
       * `anyUnitHasWeakTargetInRange`) with a skip-already-done check
       * (`anyUnitInCategoryNeedsOrder`) so the beat only surfaces when both
       * the situation matches AND there's still work for the player to do.
       */
      kind: "andAll";
      all: TutorialBeatCondition[];
    }
  | {
      /**
       * True iff the user's `drawLineFormation.enabled` setting is currently
       * off. Used as `showWhen` on the "activate draw line" prompt so the
       * beat surfaces only when the player needs to flip the toggle on,
       * and auto-dismisses the moment they do.
       */
      kind: "drawLineDisabled";
    };

/**
 * Per-chapter run-count filter. The runner tracks how many times each
 * `eachTurnWhile*` chapter has fired (Run 0 = first fire). Beats whose
 * filter excludes the current count are dropped at chapter-build time.
 *
 * Lets a single chapter pack a verbose Run-0 path and a silent Run-1+ hint
 * path without splitting into two chapters.
 */
export interface TutorialRunFilter {
  only?: number[];
  from?: number;
  until?: number;
}

export interface TutorialBeat {
  /** Locale key resolved from `scenario.locales`. Token-substituted at render. */
  copy: string;
  highlight?: TutorialHighlight;
  gesture?: TutorialGesture;
  /** Defaults to "click" when omitted. */
  advanceOn?: TutorialBeatAdvance;
  placement?: TutorialBeatPlacement;
  /**
   * Filters the unit-bound advance modes (`unitSelected`, `unitRepositioned`)
   * so only events that carry a unit of one of these categories dismiss the
   * beat. Unused for other advance modes. Category ids come from the era's
   * unit-categories JSON (e.g. `"infantry"`, `"midCavalry"`, `"artillery"`,
   * `"skirmishInfantry"`).
   */
  unitCategory?: string | string[];
  /**
   * When true, a `unitSelected` beat advances only after the player has the
   * **entire** category group selected (every player-owned, non-routing unit
   * matching `unitCategory`) and nothing else. Picking a single unit is no
   * longer enough. Independent of `gesture`, so a `selectionBox` beat can
   * still teach the drag-select while requiring the full group as the gate.
   */
  requireFullGroup?: boolean;
  /**
   * Destination for a `moveUnit` beat. Scoped to world coords (same space as
   * units / deployment zones). Only meaningful when `gesture` is `"moveUnit"`.
   * Either a static rect (`{x, y, width, height}`, optionally `kind: "rect"`)
   * or a runtime selector (e.g. `{kind: "arcAroundEnemyCenter"}`).
   */
  moveDestination?: TutorialMoveDestination;
  /**
   * Predicate evaluated at activation. When false, the beat is auto-dismissed
   * without ever being shown — used for branching beats whose condition
   * depends on the current battlefield (e.g. cavalry Run branch vs
   * Maintain branch).
   */
  showWhen?: TutorialBeatCondition;
  /**
   * Filters order-related advance modes:
   *  - `orderPlaced`: only orders of this type dismiss the beat.
   *  - `orderTypeModalOpened`: auto-skip on activation if `hud.orderType`
   *    already matches, otherwise advance the first time the modal opens.
   *  - `orderTypeSelected`: auto-skip on activation if `hud.orderType`
   *    already matches, otherwise advance when the order type changes to a
   *    matching value.
   * Ignored for other advance modes. Numeric values come from {@link OrderType}:
   * Walk=1, Run=2, Shoot=3, FireAndAdvance=4, PlaceEntity=5, Fallback=6,
   * Rotate=7.
   */
  orderType?: OrderType | OrderType[];
  /**
   * Filters formation-related advance modes:
   *  - `formationModalOpened`: auto-skip on activation if every currently
   *    selected unit (filtered by `unitCategory` when set) already has a
   *    matching formation.
   *  - `formationSelected`: advance only when the formation chosen in the
   *    modal matches; same auto-skip behavior on activation.
   * Ignored for other advance modes. Values are formation template ids
   * (e.g. `"line"`, `"column"`).
   */
  formationId?: string | string[];
  /**
   * Index into the resolved highlight rect list that the gesture hint and
   * bubble anchor on. Defaults to 0 (first rect). Useful when a beat wants
   * to point at a *different* cluster than the previous beat — e.g. the
   * second skirmisher order beat suggests a different forest/building than
   * the first. Silently falls back to rect 0 when the index is out of range.
   */
  gestureTargetIndex?: number;
  /**
   * When true, removing any order while this beat is active rewinds the
   * chapter to the preceding `orderPlaced` beat so the player can re-draw.
   * Used on the info beat that explains the remove-orders button: if they
   * actually remove the order they just drew, the tutorial puts them back
   * on the draw-order step instead of stranding them.
   */
  regressOnOrderRemoved?: boolean;
  /**
   * When true, while this beat is active the runner watches the user's
   * `drawLineFormation.enabled` setting each tick, and rewinds the chapter
   * to the preceding "activate draw line" beat (i.e. one whose `showWhen`
   * is `drawLineDisabled`) the moment draw line is turned off. Used on
   * order-placement beats whose drawing gesture only works with draw line
   * on, so the player isn't stranded if they toggle it off mid-step.
   */
  regressOnDrawLineDisabled?: boolean;
  /**
   * When true, the beat is played at most once per chapter run: once it
   * has been dismissed, the queue auto-skips it if the cursor lands on it
   * again (e.g. after a regress-then-advance cycle). Use for info beats
   * that become redundant the second time through.
   */
  oncePerChapter?: boolean;
  /**
   * Filters this beat against the chapter's run count (0-based). Only
   * meaningful for re-fireable chapters (`eachTurnWhile*`). When omitted
   * the beat plays on every run. Beats whose filter excludes the current
   * count are dropped at chapter-build time so they never reach the queue.
   */
  showOnRun?: TutorialRunFilter;
  /**
   * When true, the overlay does NOT render the bubble for this beat —
   * highlights, gesture animations, and ghost projection still render via
   * the sync layers, but there is no text, no Continue button, no dim-layer
   * dismissal. Used by Run-1+ hint beats: pure visual coaching once the
   * player has already been taught the verbose flow on Run 0. The beat still
   * dismisses via `advanceOn` (typically `orderPlaced`) or `showWhen` skip.
   */
  silent?: boolean;
  /**
   * When true, the bubble anchors on the union AABB of all resolved highlight
   * rects instead of just the first one. Useful for "wait until everyone is
   * in formation" beats that highlight a whole group — the bubble parks above
   * the group as a whole rather than next to one unit.
   */
  bubbleAnchorAabb?: boolean;
  /**
   * While the formation-select modal is open, replace this beat's bubble and
   * highlights with a single highlight inside the modal: on the line option
   * when at least one unit matching `situation` is currently selected,
   * otherwise on the modal close button. Lets a "wait until everyone is in
   * line" beat redirect attention to the right modal control without ending
   * the wait.
   */
  formationModalOverride?: {
    situation: TutorialSituationKey;
    ifMatchSelected: { targetId: string };
    otherwise: { targetId: string };
    /**
     * Additional highlight rendered alongside the group rings while the modal
     * is *closed* and at least one unit matching `situation` is currently
     * selected — usually points at the "formations" HUD button so the player
     * knows where to open the modal.
     */
    whenClosedAndMatchSelected?: { targetId: string };
  };
  /**
   * Input schemes this beat applies to. When omitted, the beat runs for all
   * schemes. When present, the beat is skipped if the active scheme is not
   * listed. Used for mechanics that only one input style needs to learn
   * (e.g. tapping deselect between selections on touch, which on mouse is
   * unnecessary because drag-in-empty-space replaces the selection).
   */
  inputSchemes?: TutorialInputScheme[];
  /**
   * Monotonic unlock list for tutorial-controlled UI elements. Ids listed
   * here become visible from this beat onwards and never disappear again —
   * once a control is introduced to the player we never re-hide it.
   *
   * While a tutorial is active, every id in the controlled vocabulary starts
   * hidden; beats and {@link Tutorial.revealUiElements} accumulate the set
   * that is *shown*.
   *
   * Supported ids:
   *  - Bottom-bar buttons: "chat", "selectIdle", "formation", "orderType",
   *    "deselect", "removeOrders", "submitOrders"
   *  - "bottomButtons" — shorthand for all bottom-bar buttons
   *  - "topButtons" — all top circular buttons (menu, replay, info, etc.)
   *  - "victoryBar" — the score / victory-point strip
   *  - "unitSummary" — the DOM unit-summary dialog
   *
   * Elements targeted by this beat's `highlight.targetId` (e.g.
   * `hud-submit-orders`) are auto-revealed regardless, so they don't need to
   * be repeated here.
   */
  revealUiElements?: string[];
}

/**
 * Situational predicate keys for chapters that watch the live game state and
 * fire when a teachable moment appears. Each key has a corresponding
 * predicate registered client-side. Extending this union without registering
 * a predicate is a compile error.
 */
export type TutorialSituationKey =
  | "skirmisherThreatenedByArtillery"
  | "skirmisherThreatenedByCavalry"
  | "skirmisherThreatenedByInfantry"
  | "infantryThreatenedByCavalryFrontal"
  | "infantryThreatenedByCavalryFlank"
  | "infantryShouldFormLineVsCavalryFrontal"
  | "infantryShouldFormLineAny"
  | "cavalryShouldFallbackFromInfantry"
  | "artilleryCanFireAndAdvance"
  | "artilleryCanRotateToFire"
  | "infantryReadyForLine"
  | "cavalryVsWeakerCavalry"
  | "cavalryVsEqualCavalry"
  | "cavalryVsStrongerCavalry"
  | "enemyInfantrySquare"
  | "cavalryVsInfantryFlank"
  | "cavalryVsShakenInfantry"
  | "cavalryVsSkirmishers"
  | "cavalryVsArtillery"
  | "cavalryShouldPursueRouter"
  | "dominatingShouldPushObjective"
  | "losingShouldFallbackToObjective"
  | "infantryFirefightRange"
  | "infantryBayonetCharge"
  | "infantryFallback"
  | "infantryVsSkirmishers"
  | "infantryVsArtillery"
  | "infantryColumnMarch"
  | "hasIdleUnit";

export type TutorialFireOn =
  /** Fires when the client enters the given turn number (including turn 0). */
  | { turn: number }
  /**
   * Fires the first frame any enemy unit is visible to the local player
   * through the fog of war. Only fires once per chapter (id-deduped like all
   * chapters). Use for tactical chapters that should appear on first contact
   * rather than at a hard-coded turn.
   */
  | { enemyVisible: true }
  /**
   * Fires on every turn transition as long as no enemy unit is visible to the
   * local player, starting at `fromTurn` (inclusive, default 0). Stops
   * matching once any enemy is seen. Unlike other fireOn variants, chapters
   * using this one are not added to the fired-chapters set and may re-fire
   * each turn. Use for idle-advance prompts between scripted beats and first
   * contact.
   */
  | { eachTurnWhileEnemyHidden: true; fromTurn?: number }
  /**
   * Mirror of `eachTurnWhileEnemyHidden` for the post-contact phase. Fires
   * on every turn transition as long as at least one enemy unit is visible
   * to the local player, starting at `fromTurn` (inclusive, default 0).
   * Chapters using this variant are not added to the fired-chapters set and
   * re-fire each turn so their dynamic destinations re-resolve against the
   * current battlefield. Use for adaptive per-turn guidance after first
   * contact.
   */
  | { eachTurnWhileEnemyVisible: true; fromTurn?: number }
  /**
   * Fires the first frame the situation predicate becomes true. Default is
   * once per game (joins the fired-chapters set). With `oncePerTurn: true`
   * the chapter re-fires on each turn transition while the situation still
   * holds — same semantics as `eachTurnWhile*`. With `oncePerUnit: true`
   * the chapter is deduped per (chapterId, unitId) pair: it can fire once
   * for each player unit that ever matches the situation, and at most one
   * such chapter fires per unit per turn. `fromTurn` (inclusive) gates the
   * earliest turn the chapter is allowed to fire on. `oncePerTurn` and
   * `oncePerUnit` are mutually exclusive. `afterChapter` gates firing on
   * a prerequisite chapter id having already fired — typically used to
   * keep situational lessons quiet until first enemy contact, so they
   * don't contradict the player's deployment-phase choices.
   * `endOfTurnIdle` defers firing until a tick on which the tutorial
   * message queue is empty and no other chapter is firing — the lesson
   * only surfaces when nothing else is competing for the player's
   * attention. Used for low-priority strategic reminders.
   */
  | {
      situation: TutorialSituationKey;
      oncePerTurn?: boolean;
      oncePerUnit?: boolean;
      fromTurn?: number;
      afterChapter?: string;
      endOfTurnIdle?: boolean;
    }
  /**
   * Passive chapter: never enqueued into the chapter queue. The overlay
   * renders the chapter's first beat as a fallback whenever no real beat is
   * active. Use for ambient hints (e.g. "submit orders to end the turn") that
   * should yield to any scripted or situational lesson without being
   * dismissed by player input.
   */
  | { whileIdle: true }
  /**
   * Fires once when the game finishes and the outcome (vs the client's team)
   * matches. `"win"` fires only if the client's team has strictly more victory
   * points than the opposing team; `"lose"` fires for everything else (loss
   * or draw — the player should be invited to retry either way).
   */
  | { gameEnded: "win" | "lose" };

export interface TutorialChapter {
  /** Stable identifier used as dedup key — once a chapter fires, it never re-fires (except for `eachTurnWhileEnemyHidden` fireOn). */
  id: string;
  fireOn: TutorialFireOn;
  beats: TutorialBeat[];
}

export interface Tutorial {
  chapters: TutorialChapter[];
  /**
   * Seed for the monotonic revealed-elements set. Same vocabulary as
   * {@link TutorialBeat.revealUiElements}. Everything in the controlled
   * vocabulary that is not listed here (and not later added by a beat or
   * highlight auto-reveal) stays hidden for the whole tutorial.
   */
  revealUiElements?: string[];
}
