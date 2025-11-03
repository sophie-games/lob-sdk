import { EntityId } from ".";

export enum OrderType {
  NoOrder = 0,
  Walk = 1,
  Run = 2,
  Shoot = 3,
  FireAndAdvance = 4,
  PlaceEntity = 5,
  Fallback = 6,
  Face = 7,
}

interface BaseOrder {
  id: EntityId;
}

export type OrderPathPoint = [number, number]; // [x, y]

export interface WalkOrder extends BaseOrder {
  type: OrderType.Walk;
  path: OrderPathPoint[];
  /** Final rotation */
  rotation?: number;
}

export interface WalkFollowOrder extends BaseOrder {
  type: OrderType.Walk;
  targetId: EntityId;
}

export interface FallbackOrder extends BaseOrder {
  type: OrderType.Fallback;
  path: OrderPathPoint[];
  /** Final rotation */
  rotation?: number;
}

export interface RunOrder extends BaseOrder {
  type: OrderType.Run;
  path: OrderPathPoint[];
  /** Final rotation */
  rotation?: number;
}

export interface RunFollowOrder extends BaseOrder {
  type: OrderType.Run;
  targetId: EntityId;
}

export interface ShootTargetOrder extends BaseOrder {
  type: OrderType.Shoot;
  targetId: EntityId;
}

export interface ShootLocationOrder extends BaseOrder {
  type: OrderType.Shoot;
  pos: [number, number];
}

export interface FaceTargetOrder extends BaseOrder {
  type: OrderType.Face;
  targetId: EntityId;
}

export interface FaceLocationOrder extends BaseOrder {
  type: OrderType.Face;
  pos: [number, number];
}

export interface FireAndAdvanceToTargetOrder extends BaseOrder {
  type: OrderType.FireAndAdvance;
  targetId: EntityId;
}

export interface FireAndAdvanceOnPathOrder extends BaseOrder {
  type: OrderType.FireAndAdvance;
  path: OrderPathPoint[];
  /** Final rotation */
  rotation?: number;
}

export interface PlaceEntityOrder extends BaseOrder {
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
  | FaceTargetOrder
  | FaceLocationOrder
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
