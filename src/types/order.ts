import { EntityId } from ".";

export enum OrderType {
  Walk = 1,
  Run = 2,
  Shoot = 3,
  FireAndAdvance = 4,
  PlaceEntity = 5,
  Fallback = 6,
  Rotate = 7,
}

interface BaseOrder {
  id: EntityId;
}

interface ExclusiveOrderProps {
  targetId?: never;
  path?: never;
  pos?: never;
}

export type OrderPathPoint = [number, number]; // [x, y]

export interface WalkOrder
  extends BaseOrder,
    Omit<ExclusiveOrderProps, "path"> {
  type: OrderType.Walk;
  path: OrderPathPoint[];
  /** Final rotation */
  rotation?: number;
}

export interface WalkFollowOrder
  extends BaseOrder,
    Omit<ExclusiveOrderProps, "targetId"> {
  type: OrderType.Walk;
  targetId: EntityId;
}

export interface FallbackOrder
  extends BaseOrder,
    Omit<ExclusiveOrderProps, "path"> {
  type: OrderType.Fallback;
  path: OrderPathPoint[];
  /** Final rotation */
  rotation?: number;
}

export interface RunOrder extends BaseOrder, Omit<ExclusiveOrderProps, "path"> {
  type: OrderType.Run;
  path: OrderPathPoint[];
  /** Final rotation */
  rotation?: number;
}

export interface RunFollowOrder
  extends BaseOrder,
    Omit<ExclusiveOrderProps, "targetId"> {
  type: OrderType.Run;
  targetId: EntityId;
}

export interface ShootTargetOrder
  extends BaseOrder,
    Omit<ExclusiveOrderProps, "targetId"> {
  type: OrderType.Shoot;
  targetId: EntityId;
}

export interface ShootLocationOrder
  extends BaseOrder,
    Omit<ExclusiveOrderProps, "pos"> {
  type: OrderType.Shoot;
  pos: [number, number];
}

export interface RotateTargetOrder
  extends BaseOrder,
    Omit<ExclusiveOrderProps, "targetId"> {
  type: OrderType.Rotate;
  targetId: EntityId;
}

export interface RotateLocationOrder
  extends BaseOrder,
    Omit<ExclusiveOrderProps, "pos"> {
  type: OrderType.Rotate;
  pos: [number, number];
}

export interface FireAndAdvanceToTargetOrder
  extends BaseOrder,
    Omit<ExclusiveOrderProps, "targetId"> {
  type: OrderType.FireAndAdvance;
  targetId: EntityId;
}

export interface FireAndAdvanceOnPathOrder
  extends BaseOrder,
    Omit<ExclusiveOrderProps, "path"> {
  type: OrderType.FireAndAdvance;
  path: OrderPathPoint[];
  /** Final rotation */
  rotation?: number;
}

export interface PlaceEntityOrder
  extends BaseOrder,
    Omit<ExclusiveOrderProps, "pos"> {
  type: OrderType.PlaceEntity;
  pos: [number, number];
  rotation?: number;
}

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
  | FallbackOrder;

export type PathOrderType =
  | OrderType.Walk
  | OrderType.FireAndAdvance
  | OrderType.Fallback;

export type PathOrder = WalkOrder | FallbackOrder | FireAndAdvanceOnPathOrder;

export interface OrderTemplate {
  id: OrderType;
  name: string;
  rangedDamageModifier?: number;
  speedModifier?: number;
  speedModifierWhenShooting?: number;
  receivedDamageModifier?: number;
  allowFireWhenMoving?: number;
  chargeResistance?: number;
  keepsEnemyRun?: boolean;
  receivedOrgDamage?: number;
  ammoConsumptionModifier?: number;
  canFocusLocation?: boolean;
}
