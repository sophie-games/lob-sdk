import type { GameTipDefinition } from "../../game-tips/types";

// A tactical read is worth seeing in a few different battles before it goes
// quiet; a one-off mechanic only needs saying once.
const TACTICAL_SHOWS = 3;

// Catalog order is priority: one lesson is queued per evaluation, so the
// basics come before the mechanics and the mechanics before tactical reads.
export const gameTips: readonly GameTipDefinition[] = [
  {
    id: "basicsSelect",
    battleOnly: false,
    // Nothing greets the player on load. Each basic waits for the moment it is
    // the next thing they need: this one, for having picked a unit.
    on: ["unitSelected"],
    condition: {
      kind: "always",
    },
    titleKey: "gameTips.basicsSelect.title",
    descriptionKey: "gameTips.basicsSelect.description",
  },
  {
    id: "basicsSubmit",
    battleOnly: false,
    on: ["orderPlaced"],
    condition: {
      kind: "always",
    },
    titleKey: "gameTips.basicsSubmit.title",
    descriptionKey: "gameTips.basicsSubmit.description",
  },
  {
    id: "basicsOrderTypes",
    battleOnly: false,
    on: ["orderPlaced"],
    condition: {
      kind: "always",
    },
    titleKey: "gameTips.basicsOrderTypes.title",
    descriptionKey: "gameTips.basicsOrderTypes.description",
  },
  {
    id: "basicsFormations",
    battleOnly: true,
    on: ["unitSelected"],
    condition: {
      kind: "always",
    },
    titleKey: "gameTips.basicsFormations.title",
    descriptionKey: "gameTips.basicsFormations.description",
  },
  {
    id: "idleUnits",
    battleOnly: false,
    // After the first order, not at turn start when every unit is idle.
    on: ["orderPlaced"],
    condition: {
      kind: "situation",
      situation: "hasIdleUnit",
    },
    titleKey: "gameTips.idleUnits.title",
    descriptionKey: "gameTips.idleUnits.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
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
      categories: ["artillery", "horseArtillery"],
    },
    titleKey: "gameTips.blockedFire.title",
    descriptionKey: "gameTips.blockedFire.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "skirmisherVsArtillery",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "skirmisherThreatenedByArtillery",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.skirmisherVsArtillery.title",
    descriptionKey: "gameTips.skirmisherVsArtillery.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "skirmisherVsCavalry",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "skirmisherThreatenedByCavalry",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.skirmisherVsCavalry.title",
    descriptionKey: "gameTips.skirmisherVsCavalry.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "skirmisherVsInfantry",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "skirmisherThreatenedByInfantry",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.skirmisherVsInfantry.title",
    descriptionKey: "gameTips.skirmisherVsInfantry.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "infantryFormLine",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "infantryShouldFormLineAny",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.infantryFormLine.title",
    descriptionKey: "gameTips.infantryFormLine.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "infantryVsCavalryFrontal",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "infantryThreatenedByCavalryFrontal",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.infantryVsCavalryFrontal.title",
    descriptionKey: "gameTips.infantryVsCavalryFrontal.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "infantryVsCavalryFlank",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "infantryThreatenedByCavalryFlank",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.infantryVsCavalryFlank.title",
    descriptionKey: "gameTips.infantryVsCavalryFlank.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "infantryBayonetCharge",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "infantryBayonetCharge",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.infantryBayonetCharge.title",
    descriptionKey: "gameTips.infantryBayonetCharge.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "infantryFallback",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "infantryFallback",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.infantryFallback.title",
    descriptionKey: "gameTips.infantryFallback.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "infantryVsSkirmishers",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "infantryVsSkirmishers",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.infantryVsSkirmishers.title",
    descriptionKey: "gameTips.infantryVsSkirmishers.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "infantryVsArtillery",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "infantryVsArtillery",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.infantryVsArtillery.title",
    descriptionKey: "gameTips.infantryVsArtillery.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "infantryColumnMarch",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "infantryColumnMarch",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.infantryColumnMarch.title",
    descriptionKey: "gameTips.infantryColumnMarch.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "cavalryVsWeakerCavalry",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "cavalryVsWeakerCavalry",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.cavalryVsWeakerCavalry.title",
    descriptionKey: "gameTips.cavalryVsWeakerCavalry.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "cavalryVsEqualCavalry",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "cavalryVsEqualCavalry",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.cavalryVsEqualCavalry.title",
    descriptionKey: "gameTips.cavalryVsEqualCavalry.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "cavalryVsStrongerCavalry",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "cavalryVsStrongerCavalry",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.cavalryVsStrongerCavalry.title",
    descriptionKey: "gameTips.cavalryVsStrongerCavalry.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "cavalryVsInfantryFlank",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "cavalryVsInfantryFlank",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.cavalryVsInfantryFlank.title",
    descriptionKey: "gameTips.cavalryVsInfantryFlank.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "cavalryVsShakenInfantry",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "cavalryVsShakenInfantry",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.cavalryVsShakenInfantry.title",
    descriptionKey: "gameTips.cavalryVsShakenInfantry.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "cavalryVsSkirmishers",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "cavalryVsSkirmishers",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.cavalryVsSkirmishers.title",
    descriptionKey: "gameTips.cavalryVsSkirmishers.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "cavalryVsArtillery",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "cavalryVsArtillery",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.cavalryVsArtillery.title",
    descriptionKey: "gameTips.cavalryVsArtillery.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "cavalryPursueRouter",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "cavalryShouldPursueRouter",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.cavalryPursueRouter.title",
    descriptionKey: "gameTips.cavalryPursueRouter.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "cavalryFallbackFromInfantry",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "cavalryShouldFallbackFromInfantry",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.cavalryFallbackFromInfantry.title",
    descriptionKey: "gameTips.cavalryFallbackFromInfantry.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "enemyInfantrySquare",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "enemyInfantrySquare",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.enemyInfantrySquare.title",
    descriptionKey: "gameTips.enemyInfantrySquare.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "artilleryFireAndAdvance",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "artilleryCanFireAndAdvance",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.artilleryFireAndAdvance.title",
    descriptionKey: "gameTips.artilleryFireAndAdvance.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "artilleryRotateToFire",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "artilleryCanRotateToFire",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.artilleryRotateToFire.title",
    descriptionKey: "gameTips.artilleryRotateToFire.description",
    action: {
      type: "unit",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "pushObjective",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "dominatingShouldPushObjective",
      targetObjective: "enemy",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.pushObjective.title",
    descriptionKey: "gameTips.pushObjective.description",
    action: {
      type: "objective",
      labelKey: "game-messages:view",
    },
  },
  {
    id: "holdObjective",
    battleOnly: true,
    on: ["ready", "stateUpdated"],
    condition: {
      kind: "situation",
      situation: "losingShouldFallbackToObjective",
      targetObjective: "friendly",
    },
    maxShows: TACTICAL_SHOWS,
    titleKey: "gameTips.holdObjective.title",
    descriptionKey: "gameTips.holdObjective.description",
    action: {
      type: "objective",
      labelKey: "game-messages:view",
    },
  },
];
