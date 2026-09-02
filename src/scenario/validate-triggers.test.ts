import { validateScenarioTriggers } from "./validate-triggers";

describe("validateScenarioTriggers", () => {
  it("rejects a non-array triggers value", () => {
    expect(validateScenarioTriggers({ event: "onTurnStart" })).toEqual([
      {
        code: "expectedArray",
        path: "triggers",
      },
    ]);
  });

  it("identifies a reinforcement unit placed at the top level of triggers", () => {
    const issues = validateScenarioTriggers([
      {
        name: "95th Rifles",
        player: 2,
        pos: { x: 621.13, y: 186.07 },
        rotation: 0.61,
        type: 7,
      },
      {
        event: "onTurnStart",
        conditions: [{ type: "isTurn", value: 18 }],
        conditionLogic: "AND",
        actions: [],
        once: true,
      },
    ]);

    expect(issues).toEqual([
      {
        code: "unitAtTriggerLevel",
        path: "triggers[0]",
      },
    ]);
  });

  it("reports the missing fields of a trigger object", () => {
    expect(validateScenarioTriggers([{}])).toEqual([
      { code: "invalidEvent", path: "triggers[0].event" },
      { code: "expectedArray", path: "triggers[0].conditions" },
      { code: "expectedArray", path: "triggers[0].actions" },
    ]);
  });

  it("rejects a trigger entry that is not an object", () => {
    expect(validateScenarioTriggers([null])).toEqual([
      { code: "expectedObject", path: "triggers[0]" },
    ]);
  });

  it("validates optional trigger settings when present", () => {
    expect(
      validateScenarioTriggers([
        {
          event: "onTurnStart",
          conditions: [],
          conditionLogic: "XOR",
          actions: [],
          once: "yes",
        },
      ]),
    ).toEqual([
      { code: "invalidConditionLogic", path: "triggers[0].conditionLogic" },
      { code: "invalidOnce", path: "triggers[0].once" },
    ]);
  });

  it("rejects malformed and unknown conditions", () => {
    expect(
      validateScenarioTriggers([
        {
          event: "onTurnStart",
          conditions: [null, { type: "whenever", value: 1 }],
          actions: [],
        },
      ]),
    ).toEqual([
      { code: "expectedObject", path: "triggers[0].conditions[0]" },
      {
        code: "invalidConditionType",
        path: "triggers[0].conditions[1].type",
        type: "whenever",
      },
    ]);
  });

  it("validates the value required by every condition type", () => {
    expect(
      validateScenarioTriggers([
        {
          event: "onTurnStart",
          conditions: [
            { type: "isTurn", value: "18" },
            { type: "isTurnMultipleOf", value: { multiple: "2" } },
            { type: "isTurnGreaterThan", value: null },
            { type: "isTurnLessThan", value: [] },
            { type: "objectiveBelongsTo", value: { name: 42, team: 2 } },
            { type: "isUnitNotAlive", value: 42 },
            { type: "isUnitRouting", value: false },
            { type: "unitMovedThisTurn", value: {} },
            { type: "chance", value: "50" },
            { type: "isVar", value: { name: "phase", value: "1" } },
          ],
          actions: [],
        },
      ]),
    ).toEqual(
      Array.from({ length: 10 }, (_, index) => ({
        code: "invalidValue",
        path: `triggers[0].conditions[${index}].value`,
        type: [
          "isTurn",
          "isTurnMultipleOf",
          "isTurnGreaterThan",
          "isTurnLessThan",
          "objectiveBelongsTo",
          "isUnitNotAlive",
          "isUnitRouting",
          "unitMovedThisTurn",
          "chance",
          "isVar",
        ][index],
      })),
    );
  });

  it("rejects malformed and unknown actions", () => {
    expect(
      validateScenarioTriggers([
        {
          event: "onTurnStart",
          conditions: [],
          actions: [null, { type: "teleportUnit", value: {} }],
        },
      ]),
    ).toEqual([
      { code: "expectedObject", path: "triggers[0].actions[0]" },
      {
        code: "invalidActionType",
        path: "triggers[0].actions[1].type",
        type: "teleportUnit",
      },
    ]);
  });

  it("validates the value required by every action type", () => {
    const actionTypes = [
      "addUnit",
      "removeUnit",
      "addTrigger",
      "showMessage",
      "defeatPlayer",
      "moveCamera",
      "setVar",
      "endGame",
      "orderUnit",
    ];
    const invalidValues = [
      {},
      [1],
      {},
      {
        "Picton arrives": "Picton arrives",
        "General Picton arrives": "General Picton arrives",
      },
      "2",
      { x: 100, y: 200 },
      { name: "phase", value: "1" },
      { reason: "timeout" },
      { type: 1 },
    ];

    expect(
      validateScenarioTriggers([
        {
          event: "onTurnStart",
          conditions: [],
          actions: actionTypes.map((type, index) => ({
            type,
            value: invalidValues[index],
          })),
        },
      ]),
    ).toEqual(
      actionTypes.map((type, index) => ({
        code: "invalidValue",
        path: `triggers[0].actions[${index}].value`,
        type,
      })),
    );
  });

  it("validates triggers nested inside an addTrigger action", () => {
    expect(
      validateScenarioTriggers([
        {
          event: "onTurnStart",
          conditions: [],
          actions: [
            {
              type: "addTrigger",
              value: [
                {
                  player: 2,
                  pos: { x: 621.13, y: 186.07 },
                  rotation: 0.61,
                  type: 7,
                },
              ],
            },
          ],
        },
      ]),
    ).toEqual([
      {
        code: "unitAtTriggerLevel",
        path: "triggers[0].actions[0].value[0]",
      },
    ]);
  });

  it("accepts the complete trigger vocabulary", () => {
    expect(
      validateScenarioTriggers([
        {
          event: "onTurnEnd",
          conditions: [
            { type: "isTurn", value: 18 },
            { type: "isTurnMultipleOf", value: { multiple: 2, offset: 1 } },
            { type: "isTurnGreaterThan", value: 10 },
            { type: "isTurnLessThan", value: 20 },
            {
              type: "objectiveBelongsTo",
              value: { name: "Quatre Bras", team: 2 },
            },
            { type: "isUnitNotAlive", value: "Ney" },
            { type: "isUnitRouting", value: "Picton" },
            { type: "unitMovedThisTurn", value: "95th Rifles" },
            { type: "chance", value: 50 },
            { type: "isVar", value: { name: "phase", value: 1, not: true } },
          ],
          conditionLogic: "OR",
          actions: [
            {
              type: "addUnit",
              value: [
                {
                  player: 2,
                  pos: { x: 621.13, y: 186.07 },
                  rotation: 0.61,
                  type: 7,
                },
              ],
            },
            { type: "removeUnit", value: ["Ney"] },
            {
              type: "addTrigger",
              value: [
                {
                  event: "onTurnStart",
                  conditions: [],
                  actions: [],
                },
              ],
            },
            {
              type: "showMessage",
              value: { title: "Picton arrives", message: "Fifth Division" },
            },
            { type: "defeatPlayer", value: 1 },
            {
              type: "moveCamera",
              value: { x: 621, y: 186, zoom: 1, duration: 2 },
            },
            { type: "setVar", value: { name: "phase", value: 2 } },
            { type: "endGame", value: { reason: "victory" } },
            {
              type: "orderUnit",
              value: {
                type: 1,
                unitName: "95th Rifles",
                path: [[621, 186]],
                rotation: 0.61,
              },
            },
          ],
          once: false,
        },
      ]),
    ).toEqual([]);
  });
});
