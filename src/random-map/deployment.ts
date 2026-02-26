import { DeploymentZone, Zone } from "@lob-sdk/types";

/**
 * Calculates the position of a deployment zone on a circle, similar to Age of Empires.
 * Zones are distributed evenly around the circumference, with their centers on the circle.
 *
 * @deprecated Use calculateCircularPlayerDeploymentZone for player-based zones instead
 *
 * @param team - The team number (1-indexed)
 * @param numTeams - Total number of teams
 * @param mapWidth - Width of the map in pixels
 * @param mapHeight - Height of the map in pixels
 * @param zoneRadius - Radius of the circular deployment zone
 * @returns The deployment zone position and dimensions
 */
export const calculateCircularDeploymentZone = (
  player: number,
  numPlayers: number,
  mapWidth: number,
  mapHeight: number,
  zoneRadius: number
): DeploymentZone => {
  const zone = calculateCircularPlayerDeploymentZone(
    player,
    numPlayers,
    mapWidth,
    mapHeight,
    zoneRadius
  );

  return {
    player,
    x: zone.x,
    y: zone.y,
    radius: zone.radius,
    ...(zone.rotation !== undefined && { rotation: zone.rotation }),
    capacity: zone.capacity ?? 0, // 0 = infinite capacity
  };
};

export const calculateCircularPlayerDeploymentZone = (
  player: number,
  numPlayers: number,
  mapWidth: number,
  mapHeight: number,
  zoneRadius: number,
  initialRotation?: number
): DeploymentZone => {
  const playerIndex = player - 1; // Convert player (1-indexed) to player index (0-indexed)

  const centerX = mapWidth / 2;
  const centerY = mapHeight / 2;

  const maxRadiusX = mapWidth / 2 - zoneRadius;
  const maxRadiusY = mapHeight / 2 - zoneRadius;

  const minDimension = Math.min(mapWidth, mapHeight);
  const margin = minDimension * 0.2;
  const availableRadius = Math.min(maxRadiusX, maxRadiusY) - margin;

  const minRadius = minDimension * 0.35;
  const finalRadius = Math.max(availableRadius, minRadius);

  const angleStep = (2 * Math.PI) / numPlayers;
  const baseAngle = Math.PI / 2 + playerIndex * angleStep;
  // Apply initial rotation if provided (for random map generation)
  const angle =
    initialRotation !== undefined ? baseAngle + initialRotation : baseAngle;

  const zoneCenterX = centerX + finalRadius * Math.cos(angle);
  const zoneCenterY = centerY - finalRadius * Math.sin(angle);

  // Rotation is tangent to the circle (perpendicular to radius)
  const rotation = -angle + Math.PI / 2;

  // Clamp to ensure the circle stays within map bounds
  const minX = zoneRadius;
  const minY = zoneRadius;
  const maxX = mapWidth - zoneRadius;
  const maxY = mapHeight - zoneRadius;

  const clampedCenterX = Math.max(minX, Math.min(zoneCenterX, maxX));
  const clampedCenterY = Math.max(minY, Math.min(zoneCenterY, maxY));

  return {
    player,
    x: clampedCenterX, // x and y represent the center of the zone
    y: clampedCenterY,
    radius: zoneRadius,
    rotation,
    capacity: 0, // 0 = infinite capacity
  };
};

/**
 * Adds forward deployment zones (for skirmishers) for each player.
 * These small zones are positioned in an arc pointing towards the map center from the main zone.
 */
export const addForwardDeploymentZones = (
  deploymentZones: DeploymentZone[],
  playerSetups: Array<{ player: number; team: number }>,
  mapWidth: number,
  mapHeight: number,
  options?: {
    /** Number of small zones to create in an arc pointing towards the map center for each player (default: 6). */
    amount?: number;
    /** Radius of the small forward zones (as percentage of main zone radius, default: 0.3). */
    radiusRatio?: number;
    /** Distance from main zone edge (as percentage of main zone radius, default: 0.2). */
    distanceRatio?: number;
    /** Deployment capacity for each forward zone. If undefined, capacity is infinite. If set, total deploymentCost of units in each forward zone cannot exceed this value. */
    capacity?: number;
    /** Spacing between zones along the arc circumference (as percentage of main zone radius, default: uses distanceRatio). If set, zones will be spaced this distance apart along the arc. */
    spacingRatio?: number;
  }
): DeploymentZone[] => {
  const { amount = 6, radiusRatio = 0.3, distanceRatio = 0.2 } = options || {};

  // Sort players to match the order used when generating zones
  const sortedPlayers = [...playerSetups].sort((a, b) => a.player - b.player);
  const newZones: DeploymentZone[] = [...deploymentZones];

  // Process each player
  for (let playerIndex = 0; playerIndex < sortedPlayers.length; playerIndex++) {
    const playerSetup = sortedPlayers[playerIndex];

    // Get the main zone for this player
    if (playerIndex >= deploymentZones.length) {
      continue;
    }

    const mainZone = deploymentZones[playerIndex];
    // x and y represent the center of the zone
    const mainZoneCenterX = mainZone.x;
    const mainZoneCenterY = mainZone.y;
    const mainZoneRadius = mainZone.radius;

    // Calculate map center
    const mapCenterX = mapWidth / 2;
    const mapCenterY = mapHeight / 2;

    // Calculate direction from main zone center to map center
    const dx = mapCenterX - mainZoneCenterX;
    const dy = mapCenterY - mainZoneCenterY;
    const angleToCenter = Math.atan2(-dy, dx); // Negative dy because Y increases downward

    // Calculate small zone properties
    const smallZoneRadius = mainZoneRadius * radiusRatio;
    const distanceFromEdge = mainZoneRadius * distanceRatio;
    const distanceFromMainZone =
      mainZoneRadius + distanceFromEdge + smallZoneRadius;

    // Calculate arc spread based on spacing or use default
    let arcSpread: number;
    let startAngle: number;

    if (options?.spacingRatio !== undefined && amount > 1) {
      // Calculate arc spread based on spacing between zones
      // The spacing is the distance along the arc circumference
      const spacingDistance = mainZoneRadius * options.spacingRatio;
      // Convert linear spacing to angular spacing: angle = spacing / radius
      const angularSpacing = spacingDistance / distanceFromMainZone;
      // Total arc spread = (amount - 1) * angular spacing
      arcSpread = (amount - 1) * angularSpacing;
      // Center the arc around the direction to map center
      startAngle = angleToCenter - arcSpread / 2;
    } else {
      // Default: use fixed 60 degree arc spread
      arcSpread = Math.PI / 3; // 60 degrees total arc spread
      startAngle = angleToCenter - arcSpread / 2;
    }

    // Generate small zones in an arc pointing towards the map center
    for (let i = 0; i < amount; i++) {
      // Calculate angle within the arc
      const angleOffset = amount > 1 ? (i / (amount - 1)) * arcSpread : 0;
      const angle = startAngle + angleOffset;

      // Calculate position in an arc at fixed distance from main zone
      const smallZoneCenterX =
        mainZoneCenterX + distanceFromMainZone * Math.cos(angle);
      const smallZoneCenterY =
        mainZoneCenterY - distanceFromMainZone * Math.sin(angle);

      // Clamp to map bounds
      const minX = smallZoneRadius;
      const minY = smallZoneRadius;
      const maxX = mapWidth - smallZoneRadius;
      const maxY = mapHeight - smallZoneRadius;

      const clampedCenterX = Math.max(minX, Math.min(smallZoneCenterX, maxX));
      const clampedCenterY = Math.max(minY, Math.min(smallZoneCenterY, maxY));

      // Calculate rotation to face towards the center
      const rotationToCenter = Math.atan2(
        -(mapCenterY - clampedCenterY),
        mapCenterX - clampedCenterX
      );

      // Create the small zone
      const smallZone: DeploymentZone = {
        player: playerSetup.player,
        x: clampedCenterX, // x and y represent the center of the zone
        y: clampedCenterY,
        radius: smallZoneRadius,
        // Rotate the small zone to face towards the center
        rotation: rotationToCenter + Math.PI / 2,
        // Set deployment capacity (0 = infinite if not specified)
        capacity: options?.capacity ?? 0,
      };

      newZones.push(smallZone);
    }
  }

  return newZones;
};
