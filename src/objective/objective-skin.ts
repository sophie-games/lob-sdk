import { ObjectiveSkins, PlayerSetup } from "@lob-sdk/types";

interface ObjectiveSkinSources {
  /** Who holds the objective now. */
  player: number;
  team: number;
  /** Skins the scenario author pinned to this objective. */
  skins?: ObjectiveSkins;
  /** The owning seat's authored skin, {@link PlayerSetup.objectiveSkin}. */
  seatSkin?: number;
  /** The owner's equipped store skin. */
  purchasedSkin?: number;
}

/** The store skin an objective flies for its current owner; authored skins win over purchased ones. */
export const resolveObjectiveSkin = ({
  player,
  team,
  skins,
  seatSkin,
  purchasedSkin,
}: ObjectiveSkinSources): number | undefined =>
  skins?.players?.[player] ?? skins?.teams?.[team] ?? seatSkin ?? purchasedSkin;

/** Every skin a scenario's objectives or seats name, so a game can load their sprites up front. */
export const collectAuthoredObjectiveSkins = (
  objectives: { skins?: ObjectiveSkins }[],
  playerSetups: Pick<PlayerSetup, "objectiveSkin">[],
): number[] => {
  const skinIds = new Set<number>();
  for (const { skins } of objectives) {
    Object.values(skins?.players ?? {}).forEach((id) => skinIds.add(id));
    Object.values(skins?.teams ?? {}).forEach((id) => skinIds.add(id));
  }
  for (const { objectiveSkin } of playerSetups) {
    if (objectiveSkin !== undefined) skinIds.add(objectiveSkin);
  }
  return [...skinIds];
};
