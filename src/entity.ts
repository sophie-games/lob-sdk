import { EntityId } from "@lob-sdk/types";

export abstract class Entity {
  id: EntityId;
  name?: string;

  constructor(id: EntityId, name?: string) {
    this.id = id;
    this.name = name;
  }
}

export enum EntityType {
  Unit,
  Objective,
}
