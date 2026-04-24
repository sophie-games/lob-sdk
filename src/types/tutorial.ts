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
  | "unitSelected" // first UNIT_SELECTED event on the client
  | "unitsDeselected" // first UNIT_DESELECTED event that leaves selection empty
  | "unitRepositioned" // first reposition committed in the deployment phase
  | "deploymentConfirmed" // turn-0 submit-orders press
  | "orderPlaced" // a movement order was drawn on the map
  | "orderTypeModalOpened" // SelectOrderModal opens; auto-skipped if hud.orderType already matches
  | "orderTypeSelected" // hud.orderType changed to one that matches; auto-skipped if already matching on activation
  | "formationModalOpened" // FormationModal opens; auto-skipped if all selected units already have the matching formation
  | "formationSelected" // a formation was applied that matches; auto-skipped if already matching on activation
  | "ordersSubmitted"; // submit-orders press on a battle turn (turn > 0)

/**
 * Input scheme the player is using. Mirrors the client-side type but lives in
 * the schema because beats can opt into a subset of schemes via `inputSchemes`.
 */
export type TutorialInputScheme = "mouse" | "touch";

export type TutorialHighlightStyle = "spotlight" | "ring";

export type TutorialHighlight = {
  /**
   * One or more targets registered in the client tutorial-target-registry.
   * When an array is provided, the overlay renders a highlight per resolved
   * target and uses the first target for bubble/gesture placement.
   */
  targetId: string | string[];
  style?: TutorialHighlightStyle;
};

export type TutorialGesture = "selectionBox" | "moveUnit" | "drawOrder";

export type TutorialBeatPlacement = "top" | "bottom" | "left" | "right";

/**
 * World-space rect describing where the tutorial wants the player to end up
 * placing the units selected by this beat. Used by the moveUnit gesture hint
 * (positions the animation over the destination, not the full deployment
 * zone) and by the ghost-projection layer (renders semi-transparent unit
 * silhouettes inside this rect).
 */
export type TutorialMoveDestination = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TutorialBeat = {
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
   * Destination rect for a `moveUnit` beat. Scoped to world coords (same
   * space as units / deployment zones). Only meaningful when `gesture` is
   * `"moveUnit"`.
   */
  moveDestination?: TutorialMoveDestination;
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
};

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
  | { eachTurnWhileEnemyHidden: true; fromTurn?: number };

export type TutorialChapter = {
  /** Stable identifier used as dedup key — once a chapter fires, it never re-fires (except for `eachTurnWhileEnemyHidden` fireOn). */
  id: string;
  fireOn: TutorialFireOn;
  beats: TutorialBeat[];
};

export type Tutorial = {
  chapters: TutorialChapter[];
  /**
   * Seed for the monotonic revealed-elements set. Same vocabulary as
   * {@link TutorialBeat.revealUiElements}. Everything in the controlled
   * vocabulary that is not listed here (and not later added by a beat or
   * highlight auto-reveal) stays hidden for the whole tutorial.
   */
  revealUiElements?: string[];
};
