import {
  collectAuthoredObjectiveSkins,
  resolveObjectiveSkin,
} from "./objective-skin";

describe("resolveObjectiveSkin", () => {
  const owner = { player: 1, team: 2 };

  it("falls back to the owner's purchased skin when nothing is authored", () => {
    expect(resolveObjectiveSkin({ ...owner, purchasedSkin: 9 })).toBe(9);
  });

  it("prefers the owner's seat skin over the purchased one", () => {
    expect(
      resolveObjectiveSkin({ ...owner, seatSkin: 4, purchasedSkin: 9 }),
    ).toBe(4);
  });

  it("prefers the objective's skin for the owning team over the seat skin", () => {
    expect(
      resolveObjectiveSkin({
        ...owner,
        skins: { teams: { 2: 7 } },
        seatSkin: 4,
        purchasedSkin: 9,
      }),
    ).toBe(7);
  });

  it("prefers the objective's skin for the owning player over its team skin", () => {
    expect(
      resolveObjectiveSkin({
        ...owner,
        skins: { players: { 1: 3 }, teams: { 2: 7 } },
        seatSkin: 4,
      }),
    ).toBe(3);
  });

  it("ignores skins authored for other owners", () => {
    expect(
      resolveObjectiveSkin({
        ...owner,
        skins: { players: { 2: 3 }, teams: { 1: 7 } },
        purchasedSkin: 9,
      }),
    ).toBe(9);
  });
});

describe("collectAuthoredObjectiveSkins", () => {
  it("lists every skin an objective or seat names, once each", () => {
    expect(
      collectAuthoredObjectiveSkins(
        [
          { skins: { players: { 1: 3, 2: 4 } } },
          { skins: { teams: { 0: 3, 1: 5 } } },
          {},
        ],
        [{ objectiveSkin: 6 }, { objectiveSkin: 4 }, {}],
      ).sort(),
    ).toEqual([3, 4, 5, 6]);
  });
});
