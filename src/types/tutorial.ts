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
  | "unitRepositioned" // first reposition committed in the deployment phase
  | "deploymentConfirmed"; // turn-0 submit-orders press

export type TutorialHighlightStyle = "spotlight" | "ring";

export type TutorialHighlight = {
  /** Must match a target registered in the client tutorial-target-registry. */
  targetId: string;
  style?: TutorialHighlightStyle;
};

export type TutorialGesture = "selectionBox" | "moveUnit";

export type TutorialBeatPlacement = "top" | "bottom" | "left" | "right";

export type TutorialBeat = {
  /** Locale key resolved from `scenario.locales`. Token-substituted at render. */
  copy: string;
  highlight?: TutorialHighlight;
  gesture?: TutorialGesture;
  /** Defaults to "click" when omitted. */
  advanceOn?: TutorialBeatAdvance;
  placement?: TutorialBeatPlacement;
};

export type TutorialFireOn =
  /** Fires when the client enters the given turn number (including turn 0). */
  { turn: number };

export type TutorialChapter = {
  /** Stable identifier used as dedup key — once a chapter fires, it never re-fires. */
  id: string;
  fireOn: TutorialFireOn;
  beats: TutorialBeat[];
};

export type Tutorial = {
  chapters: TutorialChapter[];
};
