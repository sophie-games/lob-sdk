import type {
  DeploymentPolygon,
  GameMap,
  LegacyGameMap,
  LegacyRandomDeploymentZone,
  LegacyRandomDeploymentZones,
  LegacyTeamDeploymentZone,
  LegacyTeamDeploymentZones,
  RandomDeploymentZone,
  RandomDeploymentZones,
  TeamDeploymentZone,
  TeamDeploymentZones,
  Zone,
} from "@lob-sdk/types";
import { polygonFromBounds } from "../utils/deployment-zone";

/** The ground a rectangle covered, turned clockwise around its centre. */
const rectanglePolygon = (zone: Zone): DeploymentPolygon => {
  const { x, y, width, height, rotation } = zone;
  const polygon = polygonFromBounds(x, y, x + width, y + height);
  if (!rotation) return polygon;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    outer: polygon.outer.map((corner) => {
      const dx = corner.x - centerX;
      const dy = corner.y - centerY;
      return {
        x: centerX + dx * cos - dy * sin,
        y: centerY + dx * sin + dy * cos,
      };
    }),
  };
};

/**
 * Version 1 rotation turned only the area; units kept the team's facing (team 1
 * faces up, others down). Now rotation is the facing, so add the turn to it.
 */
const turnedFacing = (team: number, rotation: number | undefined) =>
  rotation ? { rotation: (team === 1 ? 1.5 : 0.5) * Math.PI + rotation } : {};

const toTeamZone = ({
  team,
  player,
  type,
  ...rect
}: LegacyTeamDeploymentZone): TeamDeploymentZone => ({
  team,
  ...(player !== undefined ? { player } : {}),
  type,
  polygons: [rectanglePolygon(rect)],
  ...turnedFacing(team, rect.rotation),
});

export const toPolygonZoneGroups = (
  groups: LegacyTeamDeploymentZones[],
): TeamDeploymentZones[] =>
  groups.map((group) => ({
    team: group.team,
    zones:
      "zones" in group
        ? group.zones.map(toTeamZone)
        : [
            toTeamZone({ ...group.mainZone, team: group.team, type: "main" }),
            toTeamZone({
              ...group.forwardZone,
              team: group.team,
              type: "forward",
            }),
          ],
  }));

export const toPolygonMap = ({
  deploymentZones,
  ...map
}: LegacyGameMap): GameMap => ({
  ...map,
  ...(deploymentZones
    ? { deploymentZones: toPolygonZoneGroups(deploymentZones) }
    : {}),
});

const toRandomZone =
  (team: number) =>
  ({
    rect: { x, y, width, height },
    rotation,
    ...zone
  }: LegacyRandomDeploymentZone): RandomDeploymentZone => ({
    ...zone,
    ...turnedFacing(team, rotation),
    origin: { x, y },
    // Turned in map percent, which matches the old pixel turn on square maps.
    polygon: rectanglePolygon({ x: 0, y: 0, width, height, rotation }),
  });

export const toPolygonRandomZones = ({
  top,
  bottom,
}: LegacyRandomDeploymentZones): RandomDeploymentZones => ({
  top: top.map(toRandomZone(2)),
  ...(bottom ? { bottom: bottom.map(toRandomZone(1)) } : {}),
});
