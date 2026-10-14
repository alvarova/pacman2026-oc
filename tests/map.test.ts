import { describe, expect, it } from 'vitest';
import { COLS, ROWS } from '../src/game/constants';
import {
  FRUIT_TILE,
  MAP,
  PAC_START,
  parseMaze,
  passablePac,
  T,
  tileAt,
  EYES_TARGET,
  type TileId,
} from '../src/game/map';

describe('mapa del jardín', () => {
  const maze = parseMaze();

  it('tiene 25 filas de 23 columnas', () => {
    expect(MAP).toHaveLength(ROWS);
    for (const row of MAP) expect(row).toHaveLength(COLS);
  });

  it('el borde es sólido salvo el túnel de la fila 12', () => {
    for (let x = 0; x < COLS; x++) {
      expect(tileAt(maze, x, 0)).toBe(T.Wall);
      expect(tileAt(maze, x, ROWS - 1)).toBe(T.Wall);
    }
    for (let y = 0; y < ROWS; y++) {
      if (y === 12) continue;
      expect(tileAt(maze, 0, y)).toBe(T.Wall);
      expect(tileAt(maze, COLS - 1, y)).toBe(T.Wall);
    }
    expect(passablePac(tileAt(maze, -1, 12))).toBe(true);
    expect(passablePac(tileAt(maze, COLS, 12))).toBe(true);
  });

  it('tiene 4 manzanas doradas y fruta en su casilla', () => {
    expect(maze.totalPower).toBe(4);
    expect(tileAt(maze, FRUIT_TILE.x, FRUIT_TILE.y)).toBe(T.Path);
  });

  it('más de 200 manzanas en total', () => {
    expect(maze.totalApples).toBeGreaterThan(200);
  });

  it('tiene exactamente 3 caminos secretos', () => {
    expect(maze.secretCount).toBe(3);
    for (const id of [0, 1, 2]) {
      expect([...maze.secretTiles.values()]).toContain(id);
    }
  });

  it('todo lo coleccionable es alcanzable desde el inicio de Pac', () => {
    const start = { x: Math.floor(PAC_START.x), y: Math.floor(PAC_START.y) };
    const seen = new Set<number>();
    const queue = [start.y * COLS + start.x];
    seen.add(queue[0]);
    while (queue.length) {
      const cur = queue.pop()!;
      const cx = cur % COLS;
      const cy = (cur / COLS) | 0;
      const nb: [number, number][] = [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1],
      ];
      for (const [nx, ny] of nb) {
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const ni = ny * COLS + nx;
        if (seen.has(ni)) continue;
        if (!passablePac(maze.tiles[ni] as TileId)) continue;
        seen.add(ni);
        queue.push(ni);
      }
    }
    let applesReached = 0;
    let powerReached = 0;
    for (let i = 0; i < maze.tiles.length; i++) {
      if (maze.baseApples[i] === 1 && seen.has(i)) applesReached++;
      if (maze.baseApples[i] === 2 && seen.has(i)) powerReached++;
    }
    expect(applesReached).toBe(maze.totalApples);
    expect(powerReached).toBe(maze.totalPower);
    for (const i of maze.secretTiles.keys()) expect(seen.has(i)).toBe(true);
    expect(seen.has(EYES_TARGET.y * COLS + EYES_TARGET.x)).toBe(true);
  });

  it('no tiene callejones sin salida (todas las casillas tienen 2+ vecinos)', () => {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = maze.tiles[y * COLS + x];
        if (t !== T.Path && t !== T.Secret) continue;
        let deg = 0;
        const nb: [number, number][] = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ];
        for (const [nx, ny] of nb) {
          const nt = tileAt(maze, nx, ny);
          if (nt === T.Path || nt === T.Secret || nt === T.Void) deg++;
        }
        expect(deg).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
