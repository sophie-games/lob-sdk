import type { GameDataManager } from "@lob-sdk/game-data-manager";
import type {
  ManagedForcePreset,
  ManagedRosterTemplate,
  Scenario,
} from "@lob-sdk/types";
import { ScenarioFeatures } from "./scenario-features";
import { CUSTOM_UNIT_TYPE_MIN } from "./validate-custom";

export interface ManagedRosterDescriptionSeat {
  playerNumber: number;
  team: number;
  unitSlotCount: number;
  defaultForcePresetId?: string;
  forcePresets: ManagedRosterForcePreset[];
}

export interface ManagedRosterForcePreset extends ManagedForcePreset {
  /** Unit-name translation discriminator for SDK-generated one-unit choices. */
  unitNameType?: number;
}

export interface ManagedRosterDescription {
  seats: ManagedRosterDescriptionSeat[];
}

export interface ManagedForceSelection {
  playerNumber: number;
  forcePresetId?: string;
}

export interface ManagedRosterMaterialization {
  scenario: Scenario;
  /** Zero-based index within each player's materialized units. */
  leaderUnitIndexByPlayer: Record<number, number>;
}

export type ManagedRosterErrorCode =
  "INVALID_MANAGED_ROSTER" | "UNKNOWN_FORCE_PRESET" | "INSUFFICIENT_UNIT_SLOTS";

export class ManagedRosterError extends Error {
  constructor(readonly code: ManagedRosterErrorCode) {
    super(code);
    this.name = "ManagedRosterError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getManagedRoster = (
  scenario: Scenario,
): ManagedRosterTemplate | undefined => {
  const managedRoster: unknown = scenario.managedRoster;
  if (managedRoster === undefined) return undefined;
  if (
    !isRecord(managedRoster) ||
    !Array.isArray(managedRoster.forcePresets) ||
    (managedRoster.seats !== undefined &&
      !Array.isArray(managedRoster.seats)) ||
    managedRoster.forcePresets.some((preset) => !isRecord(preset)) ||
    (Array.isArray(managedRoster.seats) &&
      managedRoster.seats.some((seat) => !isRecord(seat)))
  ) {
    throw new ManagedRosterError("INVALID_MANAGED_ROSTER");
  }
  return managedRoster as unknown as ManagedRosterTemplate;
};

/**
 * Describes the selectable forces behind a fixed-roster scenario. Callers do
 * not need to know whether a force contains one unit or an entire formation.
 */
export const describeManagedRoster = (
  gameDataManager: GameDataManager,
  scenario: Scenario,
): ManagedRosterDescription => {
  if (!ScenarioFeatures.isFixedRosterPreset(scenario)) return { seats: [] };

  const managedRoster = getManagedRoster(scenario);

  const knownUnitTypes = new Set(
    gameDataManager
      .getUnitTemplateManager()
      .getTemplates()
      .map((template) => template.type),
  );
  const usesSingleUnitPresets =
    !managedRoster && ScenarioFeatures.hasOneUnitPerPlayer(scenario);
  const forcePresets: ManagedRosterForcePreset[] =
    managedRoster?.forcePresets.map(
      ({ id, name, nameKey, units, leaderUnitIndex }) => ({
        id,
        name,
        ...(nameKey !== undefined ? { nameKey } : {}),
        units,
        ...(leaderUnitIndex !== undefined ? { leaderUnitIndex } : {}),
      }),
    ) ??
    (usesSingleUnitPresets
      ? gameDataManager
          .getUnitTemplateManager()
          .getTemplates()
          .filter((template) => !template.locked)
          .filter(
            (template) =>
              !gameDataManager.disableEraDefaultUnits ||
              template.type >= CUSTOM_UNIT_TYPE_MIN,
          )
          .map((template) => ({
            id: `unit:${template.type}`,
            name: template.name,
            units: [template.type],
            leaderUnitIndex: 0,
            unitNameType: template.type,
          }))
      : []);
  const forcePresetIds = new Set<string>();
  if (
    forcePresets.some((preset) => {
      const duplicateId = forcePresetIds.has(preset.id);
      forcePresetIds.add(preset.id);
      return (
        duplicateId ||
        typeof preset.id !== "string" ||
        !/^[a-z0-9][a-z0-9:_-]{0,63}$/.test(preset.id) ||
        typeof preset.name !== "string" ||
        !preset.name.trim() ||
        preset.name.length > 80 ||
        (preset.nameKey !== undefined &&
          (typeof preset.nameKey !== "string" ||
            !preset.nameKey.trim() ||
            preset.nameKey.length > 120)) ||
        !Array.isArray(preset.units) ||
        preset.units.length === 0 ||
        preset.units.some((type) => !knownUnitTypes.has(type)) ||
        (preset.leaderUnitIndex !== undefined &&
          (!Number.isInteger(preset.leaderUnitIndex) ||
            preset.leaderUnitIndex < 0 ||
            preset.leaderUnitIndex >= preset.units.length))
      );
    })
  ) {
    throw new ManagedRosterError("INVALID_MANAGED_ROSTER");
  }
  const seatOptionsByPlayer = new Map(
    managedRoster?.seats?.map((seat) => [seat.player, seat]) ?? [],
  );
  const configuredSeats = managedRoster?.seats ?? [];
  const knownPlayers = new Set(
    scenario.players!.map((player) => player.player),
  );
  const configuredPlayers = new Set<number>();
  if (
    configuredSeats.some((seat) => {
      const duplicatePlayer = configuredPlayers.has(seat.player);
      configuredPlayers.add(seat.player);
      if (
        duplicatePlayer ||
        !Number.isInteger(seat.player) ||
        !knownPlayers.has(seat.player) ||
        (seat.forcePresetIds !== undefined &&
          (!Array.isArray(seat.forcePresetIds) ||
            seat.forcePresetIds.some((id) => typeof id !== "string"))) ||
        (seat.defaultForcePresetId !== undefined &&
          typeof seat.defaultForcePresetId !== "string")
      ) {
        return true;
      }
      const allowedIds = seat.forcePresetIds ?? [...forcePresetIds];
      const allowedIdSet = new Set(allowedIds);
      return (
        allowedIdSet.size !== allowedIds.length ||
        allowedIds.some((id) => !forcePresetIds.has(id)) ||
        (seat.defaultForcePresetId !== undefined &&
          !allowedIdSet.has(seat.defaultForcePresetId))
      );
    })
  ) {
    throw new ManagedRosterError("INVALID_MANAGED_ROSTER");
  }

  const seats = scenario.players!.map((player) => {
    const seatOptions = seatOptionsByPlayer.get(player.player);
    const allowedIds = seatOptions?.forcePresetIds
      ? new Set(seatOptions.forcePresetIds)
      : null;
    const allowedForcePresets = forcePresets.filter(
      (preset) => !allowedIds || allowedIds.has(preset.id),
    );

    return {
      playerNumber: player.player,
      team: player.team,
      unitSlotCount: scenario.units!.filter(
        (unit) => unit.player === player.player,
      ).length,
      defaultForcePresetId:
        seatOptions?.defaultForcePresetId ??
        (managedRoster
          ? allowedForcePresets[0]?.id
          : usesSingleUnitPresets
            ? `unit:${
                scenario.units!.find((unit) => unit.player === player.player)!
                  .type
              }`
            : undefined),
      forcePresets: allowedForcePresets,
    };
  });
  if (
    seats.some((seat) =>
      seat.forcePresets.some(
        (forcePreset) => forcePreset.units.length > seat.unitSlotCount,
      ),
    )
  ) {
    throw new ManagedRosterError("INSUFFICIENT_UNIT_SLOTS");
  }

  return {
    seats,
  };
};

/** Compiles managed force choices into the ordinary unit roster the engine consumes. */
export const materializeManagedRoster = (
  gameDataManager: GameDataManager,
  scenario: Scenario,
  selections: ManagedForceSelection[],
): ManagedRosterMaterialization => {
  if (!ScenarioFeatures.isFixedRosterPreset(scenario)) {
    throw new ManagedRosterError("INVALID_MANAGED_ROSTER");
  }
  const description = describeManagedRoster(gameDataManager, scenario);
  const selectionByPlayer = new Map(
    selections.map((selection) => [selection.playerNumber, selection]),
  );
  const forceByPlayer = new Map<number, ManagedForcePreset>();
  const leaderUnitIndexByPlayer: Record<number, number> = {};

  for (const seat of description.seats) {
    const selection = selectionByPlayer.get(seat.playerNumber);
    const requestedId = selection?.forcePresetId ?? seat.defaultForcePresetId;
    const forcePreset = seat.forcePresets.find(
      (candidate) => candidate.id === requestedId,
    );
    if (selection?.forcePresetId !== undefined && !forcePreset) {
      throw new ManagedRosterError("UNKNOWN_FORCE_PRESET");
    }
    if (!forcePreset) {
      leaderUnitIndexByPlayer[seat.playerNumber] = 0;
      continue;
    }
    if (forcePreset.units.length > seat.unitSlotCount) {
      throw new ManagedRosterError("INSUFFICIENT_UNIT_SLOTS");
    }
    forceByPlayer.set(seat.playerNumber, forcePreset);
    leaderUnitIndexByPlayer[seat.playerNumber] =
      forcePreset.leaderUnitIndex ?? 0;
  }

  const nextSlotByPlayer = new Map<number, number>();
  const units = scenario.units!.flatMap((unit) => {
    const forcePreset = forceByPlayer.get(unit.player);
    if (!forcePreset) return [{ ...unit }];

    const slot = nextSlotByPlayer.get(unit.player) ?? 0;
    nextSlotByPlayer.set(unit.player, slot + 1);
    const type = forcePreset.units[slot];
    return type === undefined ? [] : [{ ...unit, type }];
  });
  const { managedRoster: _managedRoster, ...materializedScenario } = scenario;

  return {
    scenario: { ...materializedScenario, units },
    leaderUnitIndexByPlayer,
  };
};
