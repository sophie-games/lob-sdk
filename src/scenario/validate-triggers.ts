import {
  GameEndReason,
  GameTriggerActionType,
  GameTriggerConditionType,
  GameTriggerEventType,
  OrderType,
} from "@lob-sdk/types";

export type ScenarioTriggerValidationIssueCode =
  | "expectedArray"
  | "expectedObject"
  | "unitAtTriggerLevel"
  | "invalidEvent"
  | "invalidConditionLogic"
  | "invalidOnce"
  | "invalidConditionType"
  | "invalidActionType"
  | "invalidValue";

export interface ScenarioTriggerValidationIssue {
  code: ScenarioTriggerValidationIssueCode;
  path: string;
  type?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const looksLikeUnit = (value: Record<string, unknown>): boolean =>
  typeof value.player === "number" &&
  typeof value.type === "number" &&
  isRecord(value.pos) &&
  typeof value.pos.x === "number" &&
  typeof value.pos.y === "number";

const conditionTypes = new Set<string>(Object.values(GameTriggerConditionType));
const actionTypes = new Set<string>(Object.values(GameTriggerActionType));

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isPointTuple = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  isNumber(value[0]) &&
  isNumber(value[1]);

const isUnitSpec = (value: unknown): boolean =>
  isRecord(value) &&
  isNumber(value.player) &&
  isNumber(value.type) &&
  isNumber(value.rotation) &&
  isRecord(value.pos) &&
  isNumber(value.pos.x) &&
  isNumber(value.pos.y);

const gameEndReasons = new Set<string>(Object.values(GameEndReason));
const orderTypes = new Set<number>([
  OrderType.Walk,
  OrderType.Run,
  OrderType.Shoot,
  OrderType.FireAndAdvance,
  OrderType.PlaceEntity,
  OrderType.Fallback,
  OrderType.Rotate,
  -1,
]);

const isValidConditionValue = (
  type: GameTriggerConditionType,
  value: unknown,
): boolean => {
  switch (type) {
    case GameTriggerConditionType.IsTurn:
    case GameTriggerConditionType.IsTurnGreaterThan:
    case GameTriggerConditionType.IsTurnLessThan:
    case GameTriggerConditionType.Chance:
      return isNumber(value);
    case GameTriggerConditionType.IsTurnMultipleOf:
      return (
        isRecord(value) &&
        isNumber(value.multiple) &&
        (value.offset === undefined || isNumber(value.offset))
      );
    case GameTriggerConditionType.ObjectiveBelongsTo:
      return (
        isRecord(value) &&
        typeof value.name === "string" &&
        (isNumber(value.player) || isNumber(value.team)) &&
        (value.player === undefined || isNumber(value.player)) &&
        (value.team === undefined || isNumber(value.team))
      );
    case GameTriggerConditionType.IsUnitNotAlive:
    case GameTriggerConditionType.IsUnitRouting:
    case GameTriggerConditionType.UnitMovedThisTurn:
      return typeof value === "string";
    case GameTriggerConditionType.IsVar:
      return (
        isRecord(value) &&
        typeof value.name === "string" &&
        isNumber(value.value) &&
        (value.not === undefined || typeof value.not === "boolean")
      );
  }
};

const validateConditions = (
  conditions: unknown[],
  triggerPath: string,
): ScenarioTriggerValidationIssue[] =>
  conditions.flatMap<ScenarioTriggerValidationIssue>((condition, index) => {
    const path = `${triggerPath}.conditions[${index}]`;
    if (!isRecord(condition)) {
      return [{ code: "expectedObject" as const, path }];
    }
    if (
      typeof condition.type !== "string" ||
      !conditionTypes.has(condition.type)
    ) {
      return [
        {
          code: "invalidConditionType" as const,
          path: `${path}.type`,
          type: typeof condition.type === "string" ? condition.type : undefined,
        },
      ];
    }
    if (
      !isValidConditionValue(
        condition.type as GameTriggerConditionType,
        condition.value,
      )
    ) {
      return [
        {
          code: "invalidValue" as const,
          path: `${path}.value`,
          type: condition.type,
        },
      ];
    }
    return [];
  });

const validateActions = (
  actions: unknown[],
  triggerPath: string,
): ScenarioTriggerValidationIssue[] =>
  actions.flatMap<ScenarioTriggerValidationIssue>((action, index) => {
    const path = `${triggerPath}.actions[${index}]`;
    if (!isRecord(action)) {
      return [{ code: "expectedObject", path }];
    }
    if (typeof action.type !== "string" || !actionTypes.has(action.type)) {
      return [
        {
          code: "invalidActionType",
          path: `${path}.type`,
          type: typeof action.type === "string" ? action.type : undefined,
        },
      ];
    }
    if (
      !isValidActionValue(action.type as GameTriggerActionType, action.value)
    ) {
      return [
        {
          code: "invalidValue",
          path: `${path}.value`,
          type: action.type,
        },
      ];
    }
    if (action.type === GameTriggerActionType.AddTrigger) {
      return (action.value as unknown[]).flatMap((nestedTrigger, index) =>
        validateTrigger(nestedTrigger, index, `${path}.value`),
      );
    }
    return [];
  });

const isValidActionValue = (
  type: GameTriggerActionType,
  value: unknown,
): boolean => {
  switch (type) {
    case GameTriggerActionType.AddUnit:
      return Array.isArray(value) && value.every(isUnitSpec);
    case GameTriggerActionType.RemoveUnit:
      return (
        Array.isArray(value) &&
        value.every((unitName) => typeof unitName === "string")
      );
    case GameTriggerActionType.AddTrigger:
      return Array.isArray(value);
    case GameTriggerActionType.ShowMessage:
      return (
        isRecord(value) &&
        typeof value.title === "string" &&
        typeof value.message === "string"
      );
    case GameTriggerActionType.DefeatPlayer:
      return isNumber(value);
    case GameTriggerActionType.MoveCamera:
      return (
        isRecord(value) &&
        isNumber(value.x) &&
        isNumber(value.y) &&
        isNumber(value.duration) &&
        (value.zoom === undefined || isNumber(value.zoom))
      );
    case GameTriggerActionType.SetVar:
      return (
        isRecord(value) &&
        typeof value.name === "string" &&
        isNumber(value.value)
      );
    case GameTriggerActionType.EndGame:
      return (
        isRecord(value) &&
        typeof value.reason === "string" &&
        gameEndReasons.has(value.reason)
      );
    case GameTriggerActionType.OrderUnit:
      return (
        isRecord(value) &&
        isNumber(value.type) &&
        orderTypes.has(value.type) &&
        typeof value.unitName === "string" &&
        (value.targetName === undefined ||
          typeof value.targetName === "string") &&
        (value.path === undefined ||
          (Array.isArray(value.path) && value.path.every(isPointTuple))) &&
        (value.pos === undefined || isPointTuple(value.pos)) &&
        (value.rotation === undefined || isNumber(value.rotation))
      );
  }
};

const validateTrigger = (
  trigger: unknown,
  index: number,
  rootPath: string,
): ScenarioTriggerValidationIssue[] => {
  const path = `${rootPath}[${index}]`;
  if (!isRecord(trigger)) {
    return [{ code: "expectedObject", path }];
  }
  if (looksLikeUnit(trigger)) {
    return [{ code: "unitAtTriggerLevel", path }];
  }

  const issues: ScenarioTriggerValidationIssue[] = [];
  if (
    trigger.event !== GameTriggerEventType.OnTurnStart &&
    trigger.event !== GameTriggerEventType.OnTurnEnd
  ) {
    issues.push({ code: "invalidEvent", path: `${path}.event` });
  }
  if (!Array.isArray(trigger.conditions)) {
    issues.push({ code: "expectedArray", path: `${path}.conditions` });
  } else {
    issues.push(...validateConditions(trigger.conditions, path));
  }
  if (!Array.isArray(trigger.actions)) {
    issues.push({ code: "expectedArray", path: `${path}.actions` });
  } else {
    issues.push(...validateActions(trigger.actions, path));
  }
  if (
    trigger.conditionLogic !== undefined &&
    trigger.conditionLogic !== "AND" &&
    trigger.conditionLogic !== "OR"
  ) {
    issues.push({
      code: "invalidConditionLogic",
      path: `${path}.conditionLogic`,
    });
  }
  if (trigger.once !== undefined && typeof trigger.once !== "boolean") {
    issues.push({ code: "invalidOnce", path: `${path}.once` });
  }
  return issues;
};

export const validateScenarioTriggers = (
  triggers: unknown,
): ScenarioTriggerValidationIssue[] => {
  if (triggers === undefined) return [];
  if (!Array.isArray(triggers)) {
    return [{ code: "expectedArray", path: "triggers" }];
  }

  return triggers.flatMap((trigger, index) =>
    validateTrigger(trigger, index, "triggers"),
  );
};
