/**
 * Lowers every tile to at most `maxStep` levels above its lowest 8-neighbour. The result is each
 * tile's minimum over all tiles of height plus steps, which is unique, so a symmetric relief stays
 * symmetric.
 */
export function limitSlopes(heightMap: number[][], maxStep: number): void {
  const tilesX = heightMap.length;
  const tilesY = heightMap[0].length;
  const queue: [number, number][] = [];
  for (let x = 0; x < tilesX; x++)
    for (let y = 0; y < tilesY; y++) queue.push([x, y]);
  queue.sort((a, b) => heightMap[a[0]][a[1]] - heightMap[b[0]][b[1]]);
  // Every lowered tile is queued again, so the pass ends at that fixed point in any order;
  // starting from the lowest tiles just keeps the re-queuing small.
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    const limit = heightMap[x][y] + maxStep;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= tilesX || ny >= tilesY) continue;
        if (heightMap[nx][ny] > limit) {
          heightMap[nx][ny] = limit;
          queue.push([nx, ny]);
        }
      }
  }
}

/**
 * Multiplies every height by `scale`, then turns each step this makes into a slope of one level
 * a tile: the midpoint between the relief lowered and raised to that slope.
 */
export function scaleIntoSlopes(heightMap: number[][], scale: number): void {
  const lowered = heightMap.map((column) => column.map((height) => height * scale));
  const raised = lowered.map((column) => column.map((height) => -height));
  limitSlopes(lowered, 1);
  limitSlopes(raised, 1);
  for (let x = 0; x < heightMap.length; x++)
    for (let y = 0; y < heightMap[x].length; y++)
      heightMap[x][y] = Math.round((lowered[x][y] - raised[x][y]) / 2);
}
