import { Point2 } from "@lob-sdk/vector";
import { EntityId } from "@lob-sdk/types";

export enum ObjectiveType {
  Small = 1,
  Big = 2,
}

export interface ObjectiveDtoBase {
  name?: string;
  player?: number;
  team?: number;
  pos: Point2;
  captureProgress?: number;
  type?: ObjectiveType;
  lo?: number;
  /** Manpower generated per turn */
  mp?: number;
  /** Gold generated per turn */
  gp?: number;
  /** Accumulated manpower resources */
  m?: number;
  /** Accumulated gold resources */
  g?: number;
  /** Victory points */
  vp?: number;
}

export type ObjectiveDto<T extends boolean = true> = T extends true
  ? ObjectiveDtoBase & { id: EntityId } // `id` is required by default
  : ObjectiveDtoBase & Partial<{ id: EntityId }>; // `id` is optional

// `id` is required
export interface ObjectiveDtoWithId extends ObjectiveDtoBase {
  id: EntityId;
}
