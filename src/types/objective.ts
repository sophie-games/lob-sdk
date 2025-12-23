import { Point2, Vector2 } from "@lob-sdk/vector";
import { EntityId } from "@lob-sdk/types";

export enum ObjectiveType {
  Small = 1,
  Big = 2,
}

export interface IObjective {
  id: EntityId;
  position: Vector2;
  player: number;
  team: number;
  type: ObjectiveType;
  logistics?: number;
  manpowerPerTurn?: number;
  goldPerTurn?: number;
  manpower?: number; // Accumulated manpower resources
  gold?: number; // Accumulated gold resources
}

export interface ObjectiveDtoBase {
  name?: string;
  player?: number;
  team?: number;
  pos: Point2;
  captureProgress?: number;
  type?: ObjectiveType;
  lo?: number;
  mp?: number; // manpowerPerTurn
  gp?: number; // goldPerTurn
  m?: number; // manpower (accumulated)
  g?: number; // gold (accumulated)
}

export type ObjectiveDto<T extends boolean = true> = T extends true
  ? ObjectiveDtoBase & { id: EntityId } // `id` is required by default
  : ObjectiveDtoBase & Partial<{ id: EntityId }>; // `id` is optional

// `id` is required
export interface ObjectiveDtoWithId extends ObjectiveDtoBase {
  id: EntityId;
}
