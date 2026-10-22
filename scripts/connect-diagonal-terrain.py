#!/usr/bin/env python3
"""Join river and road tiles that touch only at a corner.

For every pair of water (or road) tiles that are diagonal neighbours with
neither shared side tile in the same chain, turns one side tile into the
chain's terrain. Bridges belong to both chains. A side tile is never a
bridge, an objective or the other chain; buildings and deployed units are
avoided when the other side tile is free, and so is the side that would merge
the chain into a parallel one. Edits the scenario JSON in place,
touching only the changed numbers so the file keeps its formatting.

Usage: connect-diagonal-terrain.py SCENARIO.json [...]
"""
import json
import re
import sys

BUILDING, BRIDGE = 2, 7
SHALLOW_WATER = 4
WATER = {4, 5, 16}
ROAD = {3, 9, 15, 20}
TILE = 16


def chain_gaps(t, chain):
    w, h = len(t), len(t[0])
    for x in range(w - 1):
        for y in range(h):
            for dy in (-1, 1):
                y2 = y + dy
                if 0 <= y2 < h and t[x][y] in chain and t[x + 1][y2] in chain \
                        and t[x + 1][y] not in chain and t[x][y2] not in chain:
                    yield (x, y), (x + 1, y2), [(x + 1, y), (x, y2)]


def fill_type(t, a, b, chain, x, y):
    """The chain terrain most common on the side tile's four neighbours."""
    w, h = len(t), len(t[0])
    kinds = [t[i][j] for i, j in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
             if 0 <= i < w and 0 <= j < h and t[i][j] in chain and t[i][j] != BRIDGE]
    if not kinds:
        return SHALLOW_WATER if chain is WATER else 3
    ends = [t[a[0]][a[1]], t[b[0]][b[1]]]
    return max(kinds, key=lambda k: (kinds.count(k), k in ends, k == SHALLOW_WATER, -kinds.index(k)))


def connect(scenario):
    t = scenario["map"]["terrains"]
    hm = scenario["map"]["heightMap"]
    w, h = len(t), len(t[0])
    objectives = {(int(o["pos"]["x"] // TILE), int(o["pos"]["y"] // TILE)) for o in scenario["objectives"]}
    units = {(int(u["pos"]["x"] // TILE), int(u["pos"]["y"] // TILE)) for u in scenario["units"]}
    changes, unresolved = {}, []
    for name, chain, other in (("water", WATER | {BRIDGE}, ROAD), ("road", ROAD | {BRIDGE}, WATER)):
        while True:
            gap = next((g for g in chain_gaps(t, chain) if (name, g[0], g[1]) not in unresolved), None)
            if gap is None:
                break
            a, b, sides = gap
            low = max(hm[a[0]][a[1]], hm[b[0]][b[1]])
            own = {(e[0] + dx, e[1] + dy) for e in (a, b) for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1))}

            def cost(p):
                x, y = p
                if t[x][y] == BRIDGE or t[x][y] in other or p in objectives:
                    return None
                # Chain tiles around p that are not a, b or their side neighbours
                # belong to another strand, which this side would merge into.
                near = sum(t[i][j] in chain for i in range(x - 1, x + 2) for j in range(y - 1, y + 2)
                           if 0 <= i < w and 0 <= j < h and (i, j) not in own)
                return (t[x][y] == BUILDING, p in units, hm[x][y] > low, near)

            options = [(cost(p), i, p) for i, p in enumerate(sides) if cost(p) is not None]
            if not options:
                unresolved.append((name, a, b))
                continue
            _, _, (x, y) = min(options)
            changes[(x, y)] = (t[x][y], fill_type(t, a, b, chain, x, y))
            t[x][y] = changes[(x, y)][1]
    return changes, unresolved


def rewrite(text, changes):
    """Replaces the terrain ids at the changed cells, leaving the layout alone."""
    start = text.index("[", text.index('"terrains"'))
    spans, depth, x, y, i = {}, 0, -1, 0, start
    while True:
        c = text[i]
        if c == "[":
            depth += 1
            if depth == 2:
                x, y = x + 1, 0
        elif c == "]":
            depth -= 1
            if depth == 0:
                break
        elif c.isdigit() and depth == 2:
            m = re.match(r"\d+", text[i:])
            spans[(x, y)] = (i, i + m.end())
            y += 1
            i += m.end()
            continue
        i += 1
    for (x, y), (_, new) in sorted(changes.items(), key=lambda kv: -spans[kv[0]][0]):
        s, e = spans[(x, y)]
        text = text[:s] + str(new) + text[e:]
    return text


def main():
    for path in sys.argv[1:]:
        text = open(path).read()
        changes, unresolved = connect(json.loads(text))
        open(path, "w").write(rewrite(text, changes))
        print(f"{path}: {len(changes)} tiles joined")
        for (x, y), (old, new) in sorted(changes.items()):
            print(f"  ({x}, {y}) {old} -> {new}")
        for name, a, b in unresolved:
            print(f"  unresolved {name} step {a} -> {b}")


if __name__ == "__main__":
    main()
