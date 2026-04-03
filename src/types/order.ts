import { EntityId, UnitCategoryId } from "@lob-sdk/types";

/**
 * Type of order that can be given to a unit.
 */
export enum OrderType {
  /** Order to walk along a path. */
  Walk = 1,
  /** Order to run along a path. */
  Run = 2,
  /** Order to shoot at a target or location. */
  Shoot = 3,
  /** Order to fire while advancing. */
  FireAndAdvance = 4,
  /** Order to place an entity at a location. */
  PlaceEntity = 5,
  /** Order to fall back along a path. */
  Fallback = 6,
  /** Order to rotate toward a target or location. */
  Rotate = 7,
}

/**
 * Base interface for all orders.
 * All orders must have a unit ID.
 */
interface BaseOrder {
  /** The entity ID of the unit receiving the order. */
  id: EntityId;
}

/**
 * Properties that are mutually exclusive in order types.
 * Used to ensure type safety by preventing conflicting properties.
 */
interface ExclusiveOrderProps {
  /** Cannot be used with path or pos. */
  targetId?: never;
  /** Cannot be used with targetId or pos. */
  path?: never;
  /** Cannot be used with targetId or path. */
  pos?: never;
}

/**
 * A point on an order path, represented as [x, y] coordinates.
 */
export type OrderPathPoint = [number, number]; // [x, y]

/**
 * Order to walk along a specified path.
 */
export interface WalkOrder
  extends BaseOrder, Omit<ExclusiveOrderProps, "path"> {
  /** Order type is Walk. */
  type: OrderType.Walk;
  /** Path points to follow, in order. */
  path: OrderPathPoint[];
  /** Final rotation in radians after completing the path. */
  rotation?: number;
}

/**
 * Order to walk while following a target unit.
 */
export interface WalkFollowOrder
  extends BaseOrder, Omit<ExclusiveOrderProps, "targetId"> {
  /** Order type is Walk. */
  type: OrderType.Walk;
  /** Entity ID of the target unit to follow. */
  targetId: EntityId;
}

/**
 * Order to fall back along a specified path.
 */
export interface FallbackOrder
  extends BaseOrder, Omit<ExclusiveOrderProps, "path"> {
  /** Order type is Fallback. */
  type: OrderType.Fallback;
  /** Path points to fall back along, in order. */
  path: OrderPathPoint[];
  /** Final rotation in radians after completing the path. */
  rotation?: number;
}

/**
 * Order to fall back while following a target unit (keeping distance).
 */
export interface FallbackFollowOrder
  extends BaseOrder, Omit<ExclusiveOrderProps, "targetId"> {
  /** Order type is Fallback. */
  type: OrderType.Fallback;
  /** Entity ID of the target unit to keep distance from. */
  targetId: EntityId;
}

/**
 * Order to run along a specified path.
 */
export interface RunOrder extends BaseOrder, Omit<ExclusiveOrderProps, "path"> {
  /** Order type is Run. */
  type: OrderType.Run;
  /** Path points to run along, in order. */
  path: OrderPathPoint[];
  /** Final rotation in radians after completing the path. */
  rotation?: number;
}

/**
 * Order to run while following a target unit.
 */
export interface RunFollowOrder
  extends BaseOrder, Omit<ExclusiveOrderProps, "targetId"> {
  /** Order type is Run. */
  type: OrderType.Run;
  /** Entity ID of the target unit to follow. */
  targetId: EntityId;
}

/**
 * Order to shoot at a target unit.
 */
export interface ShootTargetOrder
  extends BaseOrder, Omit<ExclusiveOrderProps, "targetId"> {
  /** Order type is Shoot. */
  type: OrderType.Shoot;
  /** Entity ID of the target unit to shoot at. */
  targetId: EntityId;
}

/**
 * Order to shoot at a specific location.
 */
export interface ShootLocationOrder
  extends BaseOrder, Omit<ExclusiveOrderProps, "pos"> {
  /** Order type is Shoot. */
  type: OrderType.Shoot;
  /** Target position as [x, y] coordinates. */
  pos: [number, number];
}

/**
 * Order to rotate toward a target unit.
 */
export interface RotateTargetOrder
  extends BaseOrder, Omit<ExclusiveOrderProps, "targetId"> {
  /** Order type is Rotate. */
  type: OrderType.Rotate;
  /** Entity ID of the target unit to rotate toward. */
  targetId: EntityId;
}

/**
 * Order to rotate toward a specific location.
 */
export interface RotateLocationOrder
  extends BaseOrder, Omit<ExclusiveOrderProps, "pos"> {
  /** Order type is Rotate. */
  type: OrderType.Rotate;
  /** Target position as [x, y] coordinates. */
  pos: [number, number];
}

/**
 * Order to fire and advance toward a target unit.
 */
export interface FireAndAdvanceToTargetOrder
  extends BaseOrder, Omit<ExclusiveOrderProps, "targetId"> {
  /** Order type is FireAndAdvance. */
  type: OrderType.FireAndAdvance;
  /** Entity ID of the target unit to advance toward. */
  targetId: EntityId;
}

/**
 * Order to fire and advance along a specified path.
 */
export interface FireAndAdvanceOnPathOrder
  extends BaseOrder, Omit<ExclusiveOrderProps, "path"> {
  /** Order type is FireAndAdvance. */
  type: OrderType.FireAndAdvance;
  /** Path points to advance along while firing, in order. */
  path: OrderPathPoint[];
  /** Final rotation in radians after completing the path. */
  rotation?: number;
}

/**
 * Order to place an entity at a specific location.
 */
export interface PlaceEntityOrder
  extends BaseOrder, Omit<ExclusiveOrderProps, "pos"> {
  /** Order type is PlaceEntity. */
  type: OrderType.PlaceEntity;
  /** Position to place the entity at as [x, y] coordinates. */
  pos: [number, number];
  /** Rotation in radians for the placed entity. */
  rotation?: number;
}

/**
 * Union type representing any valid order.
 */
export type AnyOrder =
  | WalkOrder
  | WalkFollowOrder
  | RunOrder
  | RunFollowOrder
  | ShootTargetOrder
  | ShootLocationOrder
  | RotateTargetOrder
  | RotateLocationOrder
  | FireAndAdvanceToTargetOrder
  | FireAndAdvanceOnPathOrder
  | PlaceEntityOrder
  | FallbackOrder
  | FallbackFollowOrder;

/**
 * Order types that use paths for movement.
 */
export type PathOrderType =
  | OrderType.Walk
  | OrderType.FireAndAdvance
  | OrderType.Fallback;

/**
 * Union type representing orders that use paths.
 */
export type PathOrder =
  | WalkOrder
  | RunOrder
  | FallbackOrder
  | FireAndAdvanceOnPathOrder;

/**
 * Template configuration for an order type.
 * Defines modifiers and properties that apply when a unit executes this order.
 */
export interface OrderTemplate {
  /** The order type ID. */
  id: OrderType;
  /** Name of the order. */
  name: string;
  /** Modifier for ranged damage dealt while executing this order. */
  rangedDamageModifier?: number;
  /** Ranged damage modifier per unit category. Overides default but falls back if no category is provided */
  rangedDamageModifierByCategory?: Partial<Record<UnitCategoryId, number>>;
  /** Modifier for movement speed while executing this order. */
  speedModifier?: number;
  /** Modifier for movement speed while executing this order. Overrides default but falls back if no category is provided*/
  speedModifierByCategory?: Partial<Record<UnitCategoryId, number>>;
  /** Modifier for movement speed when shooting while executing this order and shooting. */
  speedModifierWhenShooting?: number;
  /** Modifier for movement speed per unit category. Overrides default but falls back if no category is provided */
  speedModifierWhenShootingByCategory?: Partial<Record<UnitCategoryId, number>>;
  /** Modifier for damage received while executing this order. */
  receivedDamageModifier?: number;
  /** Whether the unit can fire while moving (0 = false, 1 = true). */
  allowFireWhenMoving?: number;
  /** Charge resistance bonus while executing this order. */
  chargeResistance?: number;
  /** Whether this order keeps enemy units running. */
  keepsEnemyRun?: boolean;
  /** Organization damage received while executing this order. */
  receivedOrgDamage?: number;
  /** Whether the unit can focus on a specific location. */
  canFocusLocation?: boolean;
  /** Modifier for organization regain rate while executing this order. */
  orgRegainModifier?: number;
}

/**
 * Submission of orders for a player's turn.
 */
export interface TurnSubmission {
  /** The turn number this submission is for. */
  turn: number;
  /** Array of orders to execute this turn. */
  orders: AnyOrder[];
  /** Optional autofire configuration changes for units. */
  autofireConfigChanges?: UnitAutofireConfigChange[];
  /** Optional formation changes for units. */
  formationChanges?: UnitFormationChange[];
}

/**
 * Change to a unit's autofire configuration.
 */
export interface UnitAutofireConfigChange {
  /** Entity ID of the unit. */
  unitId: EntityId;
  /**
   * These are the damage types that are disabled for autofire.
   * By default, all damage types are enabled for autofire. We made it this way to avoid
   * sending a lot of data over the network.
   */
  holdFireDamageTypes: number[];
}

/**
 * Change to a unit's formation.
 */
export interface UnitFormationChange {
  /** Entity ID of the unit. */
  unitId: EntityId;
  /** ID of the formation to change to. */
  formationId: string;
}
