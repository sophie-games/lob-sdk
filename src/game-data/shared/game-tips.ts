import type { GameTipDefinition } from "../../game-tips/types";

// Catalog order determines queue order when several lessons become relevant.
export const gameTips: readonly GameTipDefinition[] = [
  {
    id: "running",
    battleOnly: false,
    on: ["ready", "unitSelected", "orderTypeChanged"],
    condition: {
      kind: "runningVulnerability",
    },
    titleKey: "gameTips.running.title",
    descriptionKey: "gameTips.running.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "overlap",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "allyOverlap",
    },
    titleKey: "gameTips.overlap.title",
    descriptionKey: "gameTips.overlap.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "ammo",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "ammoReserve",
      maxRatio: 0.5,
    },
    titleKey: "gameTips.ammo.title",
    descriptionKey: "gameTips.ammo.description",
    action: {
      type: "ammoReserve",
      labelKey: "gameTips.ammo.view",
    },
  },
  {
    id: "victoryPoints",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "victoryPoints",
      maxRatioFromAverage: -0.3,
    },
    titleKey: "gameTips.victoryPoints.title",
    descriptionKey: "gameTips.victoryPoints.description",
    action: {
      type: "battleOverview",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "organization",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "organization",
      maxRatio: 0.3,
    },
    titleKey: "gameTips.organization.title",
    descriptionKey: "gameTips.organization.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "objectives",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "ammoObjective",
    },
    titleKey: "gameTips.objectives.title",
    descriptionKey: "gameTips.objectives.description",
    action: {
      type: "objective",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "flanks",
    battleOnly: true,
    on: ["ready", "stateUpdated", "unitSelected"],
    condition: {
      kind: "exposedFlank",
    },
    titleKey: "gameTips.flanks.title",
    descriptionKey: "gameTips.flanks.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "terrain",
    battleOnly: false,
    on: ["ready", "stateUpdated", "unitSelected"],
    condition: {
      kind: "terrainModifiers",
    },
    titleKey: "gameTips.terrain.title",
    descriptionKey: "gameTips.terrain.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "range",
    battleOnly: true,
    on: ["autofireChanged"],
    condition: {
      kind: "maxAutofire",
    },
    titleKey: "gameTips.range.title",
    descriptionKey: "gameTips.range.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "charge",
    battleOnly: true,
    on: ["orderPlaced"],
    condition: {
      kind: "chargeOrder",
    },
    titleKey: "gameTips.charge.title",
    descriptionKey: "gameTips.charge.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "blockedFire",
    battleOnly: true,
    on: ["shootAttempted"],
    condition: {
      kind: "blockedShot",
      categories: ["artillery"],
    },
    titleKey: "gameTips.blockedFire.title",
    descriptionKey: "gameTips.blockedFire.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
];
