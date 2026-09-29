/**
 * Lowers every tile to at most one level above its lowest 8-neighbour. The result is each tile's
 * minimum over all tiles of height plus steps, which is unique, so a symmetric relief stays
 * symmetric.
 */
export function limitSlopes(heightMap: number[][]): void {
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
    const limit = heightMap[x][y] + 1;
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
